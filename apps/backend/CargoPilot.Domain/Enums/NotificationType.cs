#pragma warning disable CA1707 // Notification type identifiers follow UPPER_SNAKE_CASE by domain convention
namespace CargoPilot.Domain.Enums;

public enum NotificationType
{
    ERP_SYNC_ERROR,
    REPORT_READY,
    REPORT_ERROR,
    OPTIMIZATION_COMPLETE,
    OPTIMIZATION_FAILED,
    TRIAL_EXPIRING,
    TRIAL_EXPIRED,
    PAYMENT_SUCCESS,
    PAYMENT_FAILED,
    SUBSCRIPTION_RENEWED,
    SUBSCRIPTION_CANCELLED,
    PLAN_UPGRADED,
    PLAN_DOWNGRADED,
    USAGE_LIMIT_WARNING,
    USAGE_LIMIT_REACHED
}
