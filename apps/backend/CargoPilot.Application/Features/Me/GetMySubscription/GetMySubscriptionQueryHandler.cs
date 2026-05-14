using CargoPilot.Application.Abstractions;
using CargoPilot.Application.Common.Config;
using CargoPilot.Application.Common.Interfaces;
using CargoPilot.Application.Common.Models;
using CargoPilot.Domain.Enums;
using MediatR;

namespace CargoPilot.Application.Features.Me.GetMySubscription;

internal sealed class GetMySubscriptionQueryHandler
    : IRequestHandler<GetMySubscriptionQuery, Result<MySubscriptionResponse>>
{
    private readonly ICurrentUserService _currentUserService;
    private readonly ICompanyRepository _companyRepository;
    private readonly IItemRepository _itemRepository;
    private readonly IVehicleRepository _vehicleRepository;
    private readonly ILoadingPlanRepository _planRepository;

    public GetMySubscriptionQueryHandler(
        ICurrentUserService currentUserService,
        ICompanyRepository companyRepository,
        IItemRepository itemRepository,
        IVehicleRepository vehicleRepository,
        ILoadingPlanRepository planRepository)
    {
        _currentUserService = currentUserService;
        _companyRepository = companyRepository;
        _itemRepository = itemRepository;
        _vehicleRepository = vehicleRepository;
        _planRepository = planRepository;
    }

    public async Task<Result<MySubscriptionResponse>> Handle(
        GetMySubscriptionQuery request,
        CancellationToken cancellationToken)
    {
        var userType = _currentUserService.UserType;
        var userId = _currentUserService.UserId;

        if (userId is null)
            return Result<MySubscriptionResponse>.Failure(
                new Error(ErrorType.Unauthorized, "Auth.Unauthorized", "Kimlik doğrulaması gereklidir."));

        if (userType == UserType.Individual)
        {
            var subscriptionType = SubscriptionType.Free;
            var maxItems = SubscriptionLimits.GetMaxItemCount(subscriptionType);
            var maxVehicles = SubscriptionLimits.GetMaxVehicleCount(subscriptionType);
            var maxPlans = SubscriptionLimits.GetMaxLoadingPlanCount(subscriptionType);

            var currentItems = await _itemRepository.CountByUserAsync(userId.Value, cancellationToken);
            var currentVehicles = await _vehicleRepository.CountByUserAsync(userId.Value, cancellationToken);
            var currentPlans = await _planRepository.CountByUserAsync(userId.Value, cancellationToken);

            return Result<MySubscriptionResponse>.Success(new MySubscriptionResponse(
                subscriptionType,
                maxItems,
                Math.Max(0, maxItems - currentItems),
                maxVehicles,
                Math.Max(0, maxVehicles - currentVehicles),
                maxPlans,
                Math.Max(0, maxPlans - currentPlans),
                TrialEndsAt: null));
        }

        var companyId = _currentUserService.CompanyId;
        if (companyId is null)
            return Result<MySubscriptionResponse>.Failure(
                new Error(ErrorType.Unauthorized, "Auth.NoCompany", "Şirket bağlamı bulunamadı."));

        var company = await _companyRepository.GetByIdAsync(companyId.Value, cancellationToken);
        if (company is null)
            return Result<MySubscriptionResponse>.Failure(
                new Error(ErrorType.NotFound, "Company.NotFound", "Şirket bulunamadı."));

        var compSubscription = company.SubscriptionType;
        var maxItemsComp = SubscriptionLimits.GetMaxItemCount(compSubscription);
        var maxVehiclesComp = SubscriptionLimits.GetMaxVehicleCount(compSubscription);
        var maxPlansComp = SubscriptionLimits.GetMaxLoadingPlanCount(compSubscription);

        var currentItemsComp = await _itemRepository.CountByCompanyAsync(companyId.Value, cancellationToken);
        var currentVehiclesComp = await _vehicleRepository.CountByCompanyAsync(companyId.Value, cancellationToken);
        var currentPlansComp = await _planRepository.CountByCompanyAsync(companyId.Value, cancellationToken);

        return Result<MySubscriptionResponse>.Success(new MySubscriptionResponse(
            compSubscription,
            maxItemsComp,
            Math.Max(0, maxItemsComp - currentItemsComp),
            maxVehiclesComp,
            Math.Max(0, maxVehiclesComp - currentVehiclesComp),
            maxPlansComp,
            Math.Max(0, maxPlansComp - currentPlansComp),
            company.TrialEndsAt));
    }
}
