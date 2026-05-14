using CargoPilot.Application.Abstractions;
using CargoPilot.Application.Common.Config;
using CargoPilot.Application.Common.Interfaces;
using CargoPilot.Application.Common.Models;
using CargoPilot.Domain.Enums;
using MediatR;

namespace CargoPilot.Application.Features.Me.GetMySubscription;

internal sealed class GetMySubscriptionQueryHandler
    : IRequestHandler<GetMySubscriptionQuery, Result<object>>
{
    private readonly ICurrentUserService _currentUser;
    private readonly IUserRepository _userRepository;
    private readonly IItemRepository _itemRepository;
    private readonly IVehicleRepository _vehicleRepository;
    private readonly ILoadingPlanRepository _loadingPlanRepository;

    public GetMySubscriptionQueryHandler(
        ICurrentUserService currentUser,
        IUserRepository userRepository,
        IItemRepository itemRepository,
        IVehicleRepository vehicleRepository,
        ILoadingPlanRepository loadingPlanRepository)
    {
        _currentUser = currentUser;
        _userRepository = userRepository;
        _itemRepository = itemRepository;
        _vehicleRepository = vehicleRepository;
        _loadingPlanRepository = loadingPlanRepository;
    }

    public async Task<Result<object>> Handle(
        GetMySubscriptionQuery request,
        CancellationToken cancellationToken)
    {
        if (_currentUser.UserId is not { } userId)
            return Result<object>.Failure(new Error(ErrorType.Unauthorized, "Auth.Unauthorized", "Kimlik doğrulama gereklidir."));

        return _currentUser.UserType switch
        {
            UserType.Individual => await HandleIndividualAsync(userId, cancellationToken),
            UserType.CompanyAdmin => await HandleCompanyAdminAsync(userId, cancellationToken),
            _ => Result<object>.Failure(new Error(ErrorType.Forbidden, "Auth.Forbidden", "Bu işlem için yetkiniz yok."))
        };
    }

    private async Task<Result<object>> HandleIndividualAsync(Guid userId, CancellationToken ct)
    {
        const SubscriptionType subscriptionType = SubscriptionType.Free;

        var itemCount    = await _itemRepository.CountByUserAsync(userId, ct);
        var vehicleCount = await _vehicleRepository.CountByUserAsync(userId, ct);
        var planCount    = await _loadingPlanRepository.CountByUserAsync(userId, ct);

        var maxItems    = SubscriptionLimits.GetMaxItemCount(subscriptionType);
        var maxVehicles = SubscriptionLimits.GetMaxVehicleCount(subscriptionType);
        var maxPlans    = SubscriptionLimits.GetMaxLoadingPlanCount(subscriptionType);

        var response = new IndividualSubscriptionResponse(
            SubscriptionType:          subscriptionType,
            MaxItemCount:              maxItems,
            RemainingItemCount:        Math.Max(0, maxItems - itemCount),
            MaxVehicleCount:           maxVehicles,
            RemainingVehicleCount:     Math.Max(0, maxVehicles - vehicleCount),
            MaxLoadingPlanCount:       maxPlans,
            RemainingLoadingPlanCount: Math.Max(0, maxPlans - planCount),
            TrialEndsAt:               null);

        return Result<object>.Success(response);
    }

    private async Task<Result<object>> HandleCompanyAdminAsync(Guid userId, CancellationToken ct)
    {
        var user = await _userRepository.GetByIdWithCompanyAsync(userId, ct);
        if (user?.Company is not { } company)
            return Result<object>.Failure(new Error(ErrorType.NotFound, "Company.NotFound", "Şirket bulunamadı."));

        var userCount = await _userRepository.GetCompanyUserCountAsync(company.Id, ct);
        var planCount = await _loadingPlanRepository.CountByCompanyAsync(company.Id, ct);

        var response = new CompanyAdminSubscriptionResponse(
            SubscriptionType:    company.SubscriptionType,
            MaxUserCount:        company.MaxUserCount,
            CurrentUserCount:    userCount,
            TotalLoadingPlanCount: planCount,
            TrialEndsAt:         company.TrialEndsAt);

        return Result<object>.Success(response);
    }
}
