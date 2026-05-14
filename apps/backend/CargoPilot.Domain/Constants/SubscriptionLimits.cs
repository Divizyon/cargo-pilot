using CargoPilot.Domain.Enums;

namespace CargoPilot.Domain.Constants;

public static class SubscriptionLimits
{
    public static int GetMaxLoadingPlanCount(SubscriptionType subscriptionType) => subscriptionType switch
    {
        SubscriptionType.Free => 10,
        SubscriptionType.Pro => 100,
        SubscriptionType.Enterprise => int.MaxValue,
        _ => 10
    };
}
