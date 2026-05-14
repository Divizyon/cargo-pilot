using CargoPilot.Application.Abstractions;
using CargoPilot.Application.Common.Interfaces;
using CargoPilot.Application.Common.Models;
using CargoPilot.Domain.Constants;
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
    private readonly IOptimizationEngine _optimizationEngine;
    private readonly ICurrentUserService _currentUserService;
    private readonly ICompanyRepository _companyRepository;
    private readonly IValidator<CreatePlanCommand> _validator;

    public CreatePlanCommandHandler(
        ILoadingPlanRepository planRepository,
        IVehicleRepository vehicleRepository,
        IItemRepository itemRepository,
        IOptimizationEngine optimizationEngine,
        ICurrentUserService currentUserService,
        ICompanyRepository companyRepository,
        IValidator<CreatePlanCommand> validator)
    {
        _planRepository = planRepository;
        _vehicleRepository = vehicleRepository;
        _itemRepository = itemRepository;
        _optimizationEngine = optimizationEngine;
        _currentUserService = currentUserService;
        _companyRepository = companyRepository;
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

        var userType = _currentUserService.UserType;
        if (userType is UserType.CompanyAdmin or UserType.CompanyWorker && companyId is not null)
        {
            var company = await _companyRepository.GetByIdAsync(companyId.Value, cancellationToken);
            if (company is not null)
            {
                var maxPlanCount = SubscriptionLimits.GetMaxLoadingPlanCount(company.SubscriptionType);
                var currentCount = await _planRepository.CountByCompanyAsync(companyId.Value, cancellationToken);
                if (currentCount >= maxPlanCount)
                    return Result<Guid>.Failure(
                        new Error(ErrorType.BusinessRule, "Plan.LimitExceeded",
                            "Abonelik planı kapsamındaki maksimum yükleme planı sayısına ulaşıldı."));
            }
        }

        var vehicle = await _vehicleRepository.GetByIdAsync(request.VehicleId, companyId, cancellationToken);
        if (vehicle is null)
            return Result<Guid>.Failure(
                new Error(ErrorType.NotFound, "Vehicle.NotFound", "Araç bulunamadı."));

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

        var optimizationInput = BuildInput(vehicle, request.Items, itemMap);
        var result = _optimizationEngine.Run(optimizationInput);

        var planId = Guid.NewGuid();
        var plan = new LoadingPlan(planId, request.PlanName, vehicle.Id, request.OptimizationCriteria, inputTotalQuantity, companyId);
        var inputItems = request.Items
            .Select(i => new LoadingPlanInputItem(Guid.NewGuid(), planId, i.ItemId, i.Quantity))
            .ToList();

        await _planRepository.SaveWithResultAsync(plan, inputItems, result, cancellationToken);

        return Result<Guid>.Success(planId);
    }

    private static OptimizationInput BuildInput(
        Vehicle vehicle,
        IReadOnlyList<CreatePlanItemRequest> requestItems,
        Dictionary<Guid, Item> itemMap)
    {
        var inputs = requestItems
            .Select(r =>
            {
                var item = itemMap[r.ItemId];
                return new OptimizationItemInput(
                    item.Id, item.SKU, item.Name, item.ImageUrl,
                    item.Width, item.Height, item.Length, item.Weight,
                    item.IsStackable, item.AllowedRotations, r.Quantity);
            })
            .ToList();

        return new OptimizationInput(
            vehicle.InternalWidth, vehicle.InternalHeight,
            vehicle.InternalLength, vehicle.MaxWeightCapacity,
            inputs);
    }
}
