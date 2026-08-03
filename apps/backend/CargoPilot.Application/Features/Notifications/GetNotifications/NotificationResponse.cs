namespace CargoPilot.Application.Features.Notifications.GetNotifications;

public sealed record NotificationResponse(
    Guid Id,
    string Type,
    string Severity,
    string Title,
    string Description,
    string? ActionUrl,
    bool IsRead,
    DateTime? ReadAt,
    DateTime CreatedAt);
