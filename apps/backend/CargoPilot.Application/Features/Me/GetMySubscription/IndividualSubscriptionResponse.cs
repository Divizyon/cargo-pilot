using CargoPilot.Domain.Enums;

namespace CargoPilot.Application.Features.Me.GetMySubscription;

public sealed record IndividualSubscriptionResponse(
    SubscriptionType SubscriptionType,
    int MaxItemCount,
    int RemainingItemCount,
    int MaxVehicleCount,
    int RemainingVehicleCount,
    int MaxLoadingPlanCount,
    int RemainingLoadingPlanCount,
    DateTime? TrialEndsAt);
