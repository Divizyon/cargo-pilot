namespace CargoPilot.Application.Features.Subscriptions.GetCurrentSubscription;

public sealed record CurrentSubscriptionDto(
    string PlanType,
    string DisplayName
);
