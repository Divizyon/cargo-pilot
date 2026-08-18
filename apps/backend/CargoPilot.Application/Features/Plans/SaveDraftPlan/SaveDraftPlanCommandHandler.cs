using CargoPilot.Application.Abstractions;
using CargoPilot.Application.Common.Config;
using CargoPilot.Application.Common.Interfaces;
using CargoPilot.Application.Common.Models;
using CargoPilot.Domain.Entities;
using CargoPilot.Domain.Enums;
using MediatR;

namespace CargoPilot.Application.Features.Plans.SaveDraftPlan;

public sealed class SaveDraftPlanCommandHandler : IRequestHandler<SaveDraftPlanCommand, Result<Guid>>
{
    private readonly ILoadingPlanRepository _planRepository;
    private readonly IVehicleRepository _vehicleRepository;
    private readonly IItemRepository _itemRepository;
    private readonly ICurrentUserService _currentUserService;
    private readonly ICompanyRepository _companyRepository;

    public SaveDraftPlanCommandHandler(
        ILoadingPlanRepository planRepository,
        IVehicleRepository vehicleRepository,
        IItemRepository itemRepository,
        ICurrentUserService currentUserService,
        ICompanyRepository companyRepository)
    {
        _planRepository = planRepository;
        _vehicleRepository = vehicleRepository;
        _itemRepository = itemRepository;
        _currentUserService = currentUserService;
        _companyRepository = companyRepository;
    }

    public async Task<Result<Guid>> Handle(SaveDraftPlanCommand request, CancellationToken cancellationToken)
    {
        var companyId = _currentUserService.CompanyId;

        var quotaError = await EnforcePlanQuotaAsync(companyId, cancellationToken);
        if (quotaError is not null)
            return Result<Guid>.Failure(quotaError);

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

    /// <summary>
    /// Plan kotasını kullanıcının gerçek abonelik tipine göre uygular.
    /// Kota aşıldıysa hata döner, aşılmadıysa null döner.
    /// </summary>
    private async Task<Error?> EnforcePlanQuotaAsync(Guid? companyId, CancellationToken cancellationToken)
    {
        var userType = _currentUserService.UserType;
        if (!IsQuotaEnforced(userType) || _currentUserService.UserId is not { } planUserId)
            return null;

        var subscriptionType = await ResolveSubscriptionTypeAsync(companyId, cancellationToken);
        var maxCount = SubscriptionLimits.GetMaxLoadingPlanCount(subscriptionType);

        // Bireysel kullanıcının kotası kendi planlarıyla, kurumsal kullanıcınınki
        // şirketin tüm planlarıyla ölçülür (CreatePlan ve GetMySubscription ile aynı).
        var currentCount = userType == UserType.Individual || companyId is not { } quotaCompanyId
            ? await _planRepository.CountByUserAsync(planUserId, cancellationToken)
            : await _planRepository.CountByCompanyAsync(quotaCompanyId, cancellationToken);

        if (currentCount >= maxCount)
            return new Error(ErrorType.BusinessRule, "Plan.LimitExceeded",
                "Abonelik planı kapsamındaki maksimum yükleme planı sayısına ulaşıldı.");

        return null;
    }

    /// <summary>SuperAdmin platform rolüdür; müşteri kotasına tabi değildir.</summary>
    private static bool IsQuotaEnforced(UserType? userType) =>
        userType is UserType.Individual or UserType.CompanyAdmin or UserType.CompanyWorker;

    /// <summary>Abonelik tipi şirket kaydında tutulur; kayıt yoksa güvenli varsayılan Free'dir.</summary>
    private async Task<SubscriptionType> ResolveSubscriptionTypeAsync(Guid? companyId, CancellationToken cancellationToken)
    {
        if (companyId is not { } id)
            return SubscriptionType.Free;

        var company = await _companyRepository.GetByIdAsync(id, cancellationToken);
        return company?.SubscriptionType ?? SubscriptionType.Free;
    }
}
