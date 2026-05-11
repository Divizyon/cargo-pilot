using CargoPilot.Application.Abstractions;
using CargoPilot.Application.Common.Interfaces;
using CargoPilot.Domain.Entities;
using CargoPilot.Domain.Enums;

namespace CargoPilot.Application.Services;

internal sealed class NotificationService : INotificationService
{
    private readonly INotificationRepository _repository;

    public NotificationService(INotificationRepository repository)
    {
        _repository = repository;
    }

    public async Task CreateAsync(
        Guid userId,
        Guid? companyId,
        NotificationType type,
        string title,
        string description,
        string? actionUrl = null,
        Guid? integrationId = null,
        CancellationToken cancellationToken = default)
    {
        var severity = ResolveSeverity(type);

        var resolvedUrl = ResolveActionUrl(type, actionUrl, integrationId);

        var notification = new Notification(
            id: Guid.NewGuid(),
            userId: userId,
            companyId: companyId,
            type: type,
            severity: severity,
            title: title,
            description: description,
            actionUrl: resolvedUrl);

        _repository.Add(notification);
        await _repository.SaveChangesAsync(cancellationToken);
    }

    private static NotificationSeverity ResolveSeverity(NotificationType type) => type switch
    {
        NotificationType.ErpSyncError      => NotificationSeverity.Error,
        NotificationType.ReportError       => NotificationSeverity.Error,
        NotificationType.PaymentFailed     => NotificationSeverity.Error,
        NotificationType.TrialExpired      => NotificationSeverity.Error,
        NotificationType.UsageLimitReached => NotificationSeverity.Error,
        NotificationType.OptimizationFailed => NotificationSeverity.Error,

        NotificationType.TrialExpiring      => NotificationSeverity.Warning,
        NotificationType.UsageLimitWarning  => NotificationSeverity.Warning,

        NotificationType.ReportReady        => NotificationSeverity.Success,
        NotificationType.PaymentSuccess     => NotificationSeverity.Success,
        NotificationType.SubscriptionRenewed => NotificationSeverity.Success,
        NotificationType.PlanUpgraded       => NotificationSeverity.Success,
        NotificationType.OptimizationComplete => NotificationSeverity.Success,

        NotificationType.SubscriptionCancelled => NotificationSeverity.Info,
        NotificationType.PlanDowngraded        => NotificationSeverity.Info,

        _ => NotificationSeverity.Info,
    };

    private static string? ResolveActionUrl(NotificationType type, string? actionUrl, Guid? integrationId)
    {
        if (type == NotificationType.ErpSyncError && string.IsNullOrWhiteSpace(actionUrl))
        {
            var id = integrationId?.ToString() ?? "unknown";
            return $"/settings/erp?highlight=erp-card-{id}";
        }

        return actionUrl;
    }
}
