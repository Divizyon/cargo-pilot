namespace CargoPilot.Application.Features.Subscriptions.GetPlans;

public sealed record SubscriptionPlanDto(
    string PlanType,
    string DisplayName,
    decimal? MonthlyPrice,
    decimal? YearlyMonthlyPrice,
    int? YearlyDiscountPercent,
    int? MaxUsers,
    int? MaxLoadingPlans,
    int? MaxVehicles,
    int? MaxProducts,
    bool ErpAccess,
    bool ReportSharing,
    bool IsRecommended,
    bool IsEnterprise
);
