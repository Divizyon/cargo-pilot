using CargoPilot.Application.Abstractions;
using CargoPilot.Application.Common.Config;
using CargoPilot.Application.Common.Interfaces;
using CargoPilot.Application.Common.Models;
using CargoPilot.Domain.Entities;
using CargoPilot.Domain.Enums;
using FluentValidation;
using MediatR;

namespace CargoPilot.Application.Features.Plans.CreatePlan;

public sealed class CreatePlanCommandHandler : IRequestHandler<CreatePlanCommand, Result<Guid>>
{
    private readonly ILoadingPlanRepository _planRepository;
    private readonly IVehicleRepository _vehicleRepository;
    private readonly IItemRepository _itemRepository;
    private readonly ILoadingPlanItemGroupRepository _groupRepository;
    private readonly IOptimizationEngine _optimizationEngine;
    private readonly ICurrentUserService _currentUserService;
    private readonly IValidator<CreatePlanCommand> _validator;

    public CreatePlanCommandHandler(
        ILoadingPlanRepository planRepository,
        IVehicleRepository vehicleRepository,
        IItemRepository itemRepository,
        ILoadingPlanItemGroupRepository groupRepository,
        IOptimizationEngine optimizationEngine,
        ICurrentUserService currentUserService,
        IValidator<CreatePlanCommand> validator)
    {
        _planRepository = planRepository;
        _vehicleRepository = vehicleRepository;
        _itemRepository = itemRepository;
        _groupRepository = groupRepository;
        _optimizationEngine = optimizationEngine;
        _currentUserService = currentUserService;
        _validator = validator;
    }

    public async Task<Result<Guid>> Handle(CreatePlanCommand request, CancellationToken cancellationToken)
    {
        var validationResult = await _validator.ValidateAsync(request, cancellationToken);
        if (!validationResult.IsValid)
        {
            var failures = validationResult.Errors
                .Select(e => new ValidationFailure(e.PropertyName, e.ErrorMessage))
                .ToList();
            return Result<Guid>.Failure(
                new Error(ErrorType.Validation, "Validation.Failed", "Doğrulama hatası.", failures));
        }

        var companyId = _currentUserService.CompanyId;

        if (_currentUserService.UserType == UserType.Individual && _currentUserService.UserId is { } planUserId)
        {
            var currentCount = await _planRepository.CountByUserAsync(planUserId, cancellationToken);
            var maxCount = SubscriptionLimits.GetMaxLoadingPlanCount(SubscriptionType.Free);
            if (currentCount >= maxCount)
                return Result<Guid>.Failure(
                    new Error(ErrorType.BusinessRule, "Plan.LimitExceeded",
                        "Abonelik planı kapsamındaki maksimum yükleme planı sayısına ulaşıldı."));
        }

        var vehicles = await _vehicleRepository.GetByIdsAsync(request.VehicleIds, companyId, cancellationToken);
        var missingVehicleIds = request.VehicleIds.Except(vehicles.Select(v => v.Id)).ToList();
        if (missingVehicleIds.Count > 0)
            return Result<Guid>.Failure(
                new Error(ErrorType.NotFound, "Vehicle.NotFound", "Bir veya daha fazla araç bulunamadı."));

        var vehicle = vehicles[0];

        var requestedItemIds = request.Items.Select(i => i.ItemId).Distinct().ToList();
        var items = await _itemRepository.GetByIdsAsync(requestedItemIds, companyId, cancellationToken);

        var missingIds = requestedItemIds.Except(items.Select(i => i.Id)).ToList();
        if (missingIds.Count > 0)
        {
            var failures = missingIds
                .Select(id => new ValidationFailure("Items", $"Item bulunamadı: {id}"))
                .ToList();
            return Result<Guid>.Failure(
                new Error(ErrorType.NotFound, "Items.NotFound", "Bir veya daha fazla item bulunamadı.", failures));
        }

        var itemMap = items.ToDictionary(i => i.Id);

        // Load groups for any GroupId present in the request; filter out inactive ones
        var requestedGroupIds = request.Items
            .Where(i => i.GroupId.HasValue)
            .Select(i => i.GroupId!.Value)
            .Distinct()
            .ToList();

        Dictionary<Guid, LoadingPlanItemGroup> groupMap = [];
        if (requestedGroupIds.Count > 0)
        {
            var groups = await _groupRepository.GetByIdsAsync(requestedGroupIds, companyId, cancellationToken);
            groupMap = groups.ToDictionary(g => g.Id);

            var missingGroupIds = requestedGroupIds.Except(groupMap.Keys).ToList();
            if (missingGroupIds.Count > 0)
            {
                var failures = missingGroupIds
                    .Select(id => new ValidationFailure("Items", $"Grup bulunamadı: {id}"))
                    .ToList();
                return Result<Guid>.Failure(
                    new Error(ErrorType.NotFound, "Groups.NotFound", "Bir veya daha fazla grup bulunamadı.", failures));
            }
        }

        var inactiveGroupIds = groupMap.Values
            .Where(g => !g.IsActive)
            .Select(g => g.Id)
            .ToHashSet();

        var activeItems = request.Items
            .Where(i => !i.GroupId.HasValue || !inactiveGroupIds.Contains(i.GroupId.Value))
            .ToList();

        var inputTotalQuantity = activeItems.Sum(i => i.Quantity);

        var optimizationInput = BuildInput(vehicle, activeItems, itemMap, groupMap, request.OptimizationCriteria);
        var result = _optimizationEngine.Run(optimizationInput);

        var planId = Guid.NewGuid();
        var plan = new LoadingPlan(planId, request.PlanName, request.OptimizationCriteria, inputTotalQuantity, companyId);
        var planVehicles = request.VehicleIds
            .Select((vehicleId, idx) => new LoadingPlanVehicle(planId, vehicleId, idx))
            .ToList();
        var inputItems = activeItems
            .Select(i =>
            {
                var inputItem = new LoadingPlanInputItem(Guid.NewGuid(), planId, i.ItemId, i.Quantity);
                if (i.GroupId.HasValue && groupMap.ContainsKey(i.GroupId.Value))
                    inputItem.AssignGroup(i.GroupId);
                return inputItem;
            })
            .ToList();

        await _planRepository.SaveWithResultAsync(plan, planVehicles, inputItems, result, cancellationToken);

        return Result<Guid>.Success(planId);
    }

    private static OptimizationInput BuildInput(
        Vehicle vehicle,
        IReadOnlyList<CreatePlanItemRequest> requestItems,
        Dictionary<Guid, Item> itemMap,
        Dictionary<Guid, LoadingPlanItemGroup> groupMap,
        LoadingPlanOptimizationCriteria criteria)
    {
        var inputs = requestItems
            .Select(r =>
            {
                var item = itemMap[r.ItemId];
                var group = r.GroupId.HasValue && groupMap.TryGetValue(r.GroupId.Value, out var g) ? g : null;
                return new OptimizationItemInput(
                    item.Id, item.SKU, item.Name, item.ImageUrl,
                    item.Width, item.Height, item.Length, item.Weight,
                    item.IsStackable, item.MaxStackCount, item.MaxWeightOnTop,
                    item.AllowedRotations, r.Quantity,
                    group?.Id, group?.UnloadingOrder);
            })
            .ToList();

        return new OptimizationInput(
            vehicle.InternalWidth, vehicle.InternalHeight,
            vehicle.InternalLength, vehicle.MaxWeightCapacity,
            inputs, criteria);
    }
}
