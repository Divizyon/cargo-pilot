namespace CargoPilot.Application.Features.Notifications.GetNotifications;

public sealed record NotificationsPagedResponse(
    IReadOnlyList<NotificationResponse> Items,
    DateTime? NextCursor,
    int TotalUnread);
