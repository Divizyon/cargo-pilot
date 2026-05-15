using CargoPilot.Domain.Enums;

namespace CargoPilot.Domain.Subscriptions;

public static class SubscriptionLimits
{
    public static int? GetMaxUserCount(SubscriptionType type) => type switch
    {
        SubscriptionType.Free       => 1,
        SubscriptionType.Pro        => 10,
        SubscriptionType.Enterprise => null,
        _                           => null
    };

    public static int? GetMaxLoadingPlanCount(SubscriptionType type) => type switch
    {
        SubscriptionType.Free       => 10,
        SubscriptionType.Pro        => 50,
        SubscriptionType.Enterprise => null,
        _                           => null
    };

    public static int? GetMaxVehicleCount(SubscriptionType type) => type switch
    {
        SubscriptionType.Free       => 5,
        SubscriptionType.Pro        => 20,
        SubscriptionType.Enterprise => null,
        _                           => null
    };

    public static int? GetMaxItemCount(SubscriptionType type) => type switch
    {
        SubscriptionType.Free       => 100,
        SubscriptionType.Pro        => 500,
        SubscriptionType.Enterprise => null,
        _                           => null
    };
}
