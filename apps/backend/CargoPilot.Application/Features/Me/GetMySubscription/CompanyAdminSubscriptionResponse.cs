using CargoPilot.Domain.Enums;

namespace CargoPilot.Application.Features.Me.GetMySubscription;

public sealed record CompanyAdminSubscriptionResponse(
    SubscriptionType SubscriptionType,
    int MaxUserCount,
    int CurrentUserCount,
    int TotalLoadingPlanCount,
    DateTime? TrialEndsAt);
