using CargoPilot.Application.Abstractions;
using CargoPilot.Application.Common;
using CargoPilot.Application.Common.Interfaces;
using CargoPilot.Application.Common.Models;
using CargoPilot.Domain.Entities;
using CargoPilot.Domain.Enums;
using FluentValidation;
using MediatR;

namespace CargoPilot.Application.Features.Plans.ReOptimizePlan;

public sealed class ReOptimizePlanCommandHandler : IRequestHandler<ReOptimizePlanCommand, Result<Guid>>
{
    private readonly ILoadingPlanRepository _planRepository;
    private readonly IVehicleRepository _vehicleRepository;
    private readonly IItemRepository _itemRepository;
    private readonly ILoadingPlanItemGroupRepository _groupRepository;
    private readonly IOptimizationEngine _optimizationEngine;
    private readonly ICurrentUserService _currentUserService;
    private readonly IValidator<ReOptimizePlanCommand> _validator;

    public ReOptimizePlanCommandHandler(
        ILoadingPlanRepository planRepository,
        IVehicleRepository vehicleRepository,
        IItemRepository itemRepository,
        ILoadingPlanItemGroupRepository groupRepository,
        IOptimizationEngine optimizationEngine,
        ICurrentUserService currentUserService,
        IValidator<ReOptimizePlanCommand> validator)
    {
        _planRepository = planRepository;
        _vehicleRepository = vehicleRepository;
        _itemRepository = itemRepository;
        _groupRepository = groupRepository;
        _optimizationEngine = optimizationEngine;
        _currentUserService = currentUserService;
        _validator = validator;
    }

    public async Task<Result<Guid>> Handle(ReOptimizePlanCommand request, CancellationToken cancellationToken)
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

        var plan = await _planRepository.GetByIdAsync(request.Id, companyId, cancellationToken);
        if (plan is null)
            return Result<Guid>.Failure(
                new Error(ErrorType.NotFound, "Plan.NotFound", "Yükleme planı bulunamadı."));

        var vehicle = await _vehicleRepository.GetByIdAsync(request.VehicleId, companyId, cancellationToken);
        if (vehicle is null)
            return Result<Guid>.Failure(
                new Error(ErrorType.NotFound, "Vehicle.NotFound", "Araç bulunamadı."));

        if (vehicle.IsDraft)
            return Result<Guid>.Failure(
                new Error(ErrorType.BusinessRule, "Vehicle.IsDraft", "Taslak araç ile plan oluşturulamaz."));

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
        var inputTotalQuantity = request.Items.Sum(i => i.Quantity);

        // Mevcut grupları sil — her reoptimize yeni grup satırları oluşturur, eskiler silinmezse birikirdi
        await _groupRepository.DeleteByPlanIdAsync(plan.Id, cancellationToken);

        // Inline grup tanımları varsa entity'leri oluştur ve DB kayıt izleyicisine ekle
        Dictionary<Guid, LoadingPlanItemGroup> inlineGroupMap = [];
        if (request.Groups is { Count: > 0 })
        {
            foreach (var gd in request.Groups)
            {
                var entity = new LoadingPlanItemGroup(Guid.NewGuid(), plan.Id, gd.Name, gd.Color, gd.UnloadingOrder);
                _groupRepository.Add(entity);
                inlineGroupMap[gd.ClientGroupId] = entity;
            }
        }

        var optimizationInput = BuildInput(vehicle, request.Items, itemMap, inlineGroupMap, request.OptimizationCriteria, request.ClusterGroups);

        var contamination = request.AllowContamination
            ? new ContaminationFilter.Result(optimizationInput.Items, [])
            : ContaminationFilter.Filter(optimizationInput.Items);

        var itemsForEngine = request.AllowContamination
            ? optimizationInput.Items
                .Select(i => i with { IncompatibleGroups = null })
                .ToList()
            : contamination.Passed;

        var finalInput = optimizationInput with { Items = itemsForEngine };

        var engineResult = _optimizationEngine.Run(finalInput);
        var result = contamination.Contaminated.Count > 0
            ? engineResult with { UnplacedItems = [.. engineResult.UnplacedItems, .. contamination.Contaminated] }
            : engineResult;

        var newInputItems = request.Items
            .Select(i =>
            {
                var inputItem = new LoadingPlanInputItem(Guid.NewGuid(), plan.Id, i.ItemId, i.Quantity);
                if (i.GroupId.HasValue && inlineGroupMap.TryGetValue(i.GroupId.Value, out var inlineGroup))
                    inputItem.AssignGroup(inlineGroup.Id);
                return inputItem;
            })
            .ToList();

        plan.Reoptimize(request.VehicleId, request.OptimizationCriteria, inputTotalQuantity);

        await _planRepository.ReOptimizeWithResultAsync(plan, newInputItems, result, cancellationToken);

        return Result<Guid>.Success(plan.Id);
    }

    private static OptimizationInput BuildInput(
        Vehicle vehicle,
        IReadOnlyList<ReOptimizePlanItemRequest> requestItems,
        Dictionary<Guid, Item> itemMap,
        Dictionary<Guid, LoadingPlanItemGroup> groupMap,
        LoadingPlanOptimizationCriteria criteria,
        bool clusterGroups)
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
                    group?.Id, group?.UnloadingOrder,
                    item.StackGroup, item.GetIncompatibleGroups());
            })
            .ToList();

        return new OptimizationInput(
            vehicle.InternalWidth.GetValueOrDefault(),
            vehicle.InternalHeight.GetValueOrDefault(),
            vehicle.InternalLength.GetValueOrDefault(),
            vehicle.MaxWeightCapacity.GetValueOrDefault(),
            inputs, criteria, vehicle.LoadingType, clusterGroups);
    }
}
