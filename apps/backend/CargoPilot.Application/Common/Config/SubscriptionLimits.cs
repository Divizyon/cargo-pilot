using CargoPilot.Domain.Enums;

namespace CargoPilot.Application.Common.Config;

public static class SubscriptionLimits
{
    public static int GetMaxItemCount(SubscriptionType subscriptionType) => subscriptionType switch
    {
        SubscriptionType.Free => 50,
        SubscriptionType.Pro => 500,
        SubscriptionType.Enterprise => int.MaxValue,
        _ => 50
    };

    public static int GetMaxVehicleCount(SubscriptionType subscriptionType) => subscriptionType switch
    {
        SubscriptionType.Free => 10,
        SubscriptionType.Pro => 100,
        SubscriptionType.Enterprise => int.MaxValue,
        _ => 10
    };

    public static int GetMaxLoadingPlanCount(SubscriptionType subscriptionType) => subscriptionType switch
    {
        SubscriptionType.Free => 10,
        SubscriptionType.Pro => 100,
        SubscriptionType.Enterprise => int.MaxValue,
        _ => 10
    };
}
