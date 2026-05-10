using CargoPilot.Application.Common.Models;
using CargoPilot.Domain.Enums;
using MediatR;

namespace CargoPilot.Application.Features.Notifications.GetNotifications;

public sealed record GetNotificationsQuery(
    DateTime? Cursor,
    NotificationType? Type,
    NotificationSeverity? Severity,
    bool? IsRead,
    string? Search) : IRequest<Result<NotificationsPagedResponse>>;
