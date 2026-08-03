using CargoPilot.Application.Abstractions;
using CargoPilot.Application.Common.Config;
using CargoPilot.Application.Common.Interfaces;
using CargoPilot.Application.Common.Models;
using CargoPilot.Domain.Entities;
using CargoPilot.Domain.Enums;
using FluentValidation;
using MediatR;

namespace CargoPilot.Application.Features.Plans.SaveDraftPlan;

public sealed class SaveDraftPlanCommandHandler : IRequestHandler<SaveDraftPlanCommand, Result<Guid>>
{
    private readonly ILoadingPlanRepository _planRepository;
    private readonly IVehicleRepository _vehicleRepository;
    private readonly IItemRepository _itemRepository;
    private readonly ICurrentUserService _currentUserService;
    private readonly IValidator<SaveDraftPlanCommand> _validator;

    public SaveDraftPlanCommandHandler(
        ILoadingPlanRepository planRepository,
        IVehicleRepository vehicleRepository,
        IItemRepository itemRepository,
        ICurrentUserService currentUserService,
        IValidator<SaveDraftPlanCommand> validator)
    {
        _planRepository = planRepository;
        _vehicleRepository = vehicleRepository;
        _itemRepository = itemRepository;
        _currentUserService = currentUserService;
        _validator = validator;
    }

    public async Task<Result<Guid>> Handle(SaveDraftPlanCommand request, CancellationToken cancellationToken)
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
                .Select(id => new ValidationFailure("Items", $"Ürün bulunamadı: {id}"))
                .ToList();
            return Result<Guid>.Failure(
                new Error(ErrorType.NotFound, "Items.NotFound", "Bir veya daha fazla ürün bulunamadı.", failures));
        }

        var planId = Guid.NewGuid();
        var planName = string.IsNullOrWhiteSpace(request.PlanName) ? "Taslak Plan" : request.PlanName;
        var inputTotalQuantity = request.Items.Sum(i => i.Quantity);

        var plan = new LoadingPlan(planId, planName, vehicle.Id, request.OptimizationCriteria, inputTotalQuantity, companyId);
        var inputItems = request.Items
            .Select(i => new LoadingPlanInputItem(Guid.NewGuid(), planId, i.ItemId, i.Quantity))
            .ToList();

        await _planRepository.SaveDraftAsync(plan, inputItems, cancellationToken);

        return Result<Guid>.Success(planId);
    }
}
