using CargoPilot.Application.Abstractions;
using CargoPilot.Application.Common.Interfaces;
using CargoPilot.Application.Common.Models;
using CargoPilot.Application.Common.Policies;
using CargoPilot.Domain.Enums;
using MediatR;

namespace CargoPilot.Application.Features.Notifications.GetNotifications;

public sealed class GetNotificationsQueryHandler
    : IRequestHandler<GetNotificationsQuery, Result<NotificationsPagedResponse>>
{
    private const int PageSize = 20;

    private readonly INotificationRepository _repository;
    private readonly ICurrentUserService _currentUser;

    public GetNotificationsQueryHandler(
        INotificationRepository repository,
        ICurrentUserService currentUser)
    {
        _repository  = repository;
        _currentUser = currentUser;
    }

    public async Task<Result<NotificationsPagedResponse>> Handle(
        GetNotificationsQuery request,
        CancellationToken cancellationToken)
    {
        var userId = _currentUser.UserId;
        if (userId is null)
            return Result<NotificationsPagedResponse>.Failure(
                new Error(ErrorType.Unauthorized, "Auth.Required", "Kimlik doğrulaması gerekli."));

        var typeFilter = BuildTypeFilter(request.Type);

        var notifications = await _repository.GetPagedAsync(
            userId.Value,
            request.Cursor,
            typeFilter,
            request.Severity,
            request.IsRead,
            request.Search,
            cancellationToken);

        var hasMore    = notifications.Count > PageSize;
        var items      = notifications.Take(PageSize).ToList();
        var nextCursor = hasMore ? items[^1].CreatedAtUtc : (DateTime?)null;

        var unreadCount = await _repository.GetUnreadCountAsync(userId.Value, cancellationToken);

        var response = new NotificationsPagedResponse(
            items.Select(n => new NotificationResponse(
                n.Id,
                n.Type.ToString(),
                n.Severity.ToString(),
                n.Title,
                n.Description,
                n.ActionUrl,
                n.IsRead,
                n.ReadAt,
                n.CreatedAtUtc)).ToList(),
            nextCursor,
            unreadCount);

        return Result<NotificationsPagedResponse>.Success(response);
    }

    private List<NotificationType>? BuildTypeFilter(NotificationType? requestedType)
    {
        var allowedTypes = NotificationVisibilityPolicy.GetAllowedTypes(_currentUser.UserType);

        if (allowedTypes != null)
        {
            if (requestedType.HasValue)
                return allowedTypes.Contains(requestedType.Value)
                    ? new List<NotificationType> { requestedType.Value }
                    : new List<NotificationType>();
            return new List<NotificationType>(allowedTypes);
        }

        return requestedType.HasValue
            ? new List<NotificationType> { requestedType.Value }
            : null;
    }
}
