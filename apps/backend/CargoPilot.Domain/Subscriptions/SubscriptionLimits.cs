using CargoPilot.Domain.Enums;

namespace CargoPilot.Domain.Subscriptions;

public static class SubscriptionLimits
{
    public static int? GetMaxUserCount(SubscriptionType type) => type switch
    {
        SubscriptionType.Free       => 1000,
        SubscriptionType.Pro        => 1000,
        SubscriptionType.Enterprise => null,
        _                           => null
    };

    public static int? GetMaxLoadingPlanCount(SubscriptionType type) => type switch
    {
        SubscriptionType.Free       => 1000,
        SubscriptionType.Pro        => 1000,
        SubscriptionType.Enterprise => null,
        _                           => null
    };

    public static int? GetMaxVehicleCount(SubscriptionType type) => type switch
    {
        SubscriptionType.Free       => 1000,
        SubscriptionType.Pro        => 1000,
        SubscriptionType.Enterprise => null,
        _                           => null
    };

    public static int? GetMaxItemCount(SubscriptionType type) => type switch
    {
        SubscriptionType.Free       => 1000,
        SubscriptionType.Pro        => 1000,
        SubscriptionType.Enterprise => null,
        _                           => null
    };
}
