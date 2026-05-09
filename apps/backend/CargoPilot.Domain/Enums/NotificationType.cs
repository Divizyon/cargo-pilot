namespace CargoPilot.Domain.Enums;

public enum NotificationType
{
    ErpSyncError,
    ReportReady,
    ReportError,
    OptimizationComplete,
    OptimizationFailed,
    TrialExpiring,
    TrialExpired,
    PaymentSuccess,
    PaymentFailed,
    SubscriptionRenewed,
    SubscriptionCancelled,
    PlanUpgraded,
    PlanDowngraded,
    UsageLimitWarning,
    UsageLimitReached
}
