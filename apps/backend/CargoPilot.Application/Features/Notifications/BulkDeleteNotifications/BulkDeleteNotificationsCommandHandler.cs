using CargoPilot.Application.Abstractions;
using CargoPilot.Application.Common.Interfaces;
using CargoPilot.Application.Common.Models;
using MediatR;

namespace CargoPilot.Application.Features.Notifications.BulkDeleteNotifications;

public sealed class BulkDeleteNotificationsCommandHandler
    : IRequestHandler<BulkDeleteNotificationsCommand, Result<bool>>
{
    private readonly INotificationRepository _repository;
    private readonly ICurrentUserService _currentUser;

    public BulkDeleteNotificationsCommandHandler(
        INotificationRepository repository,
        ICurrentUserService currentUser)
    {
        _repository  = repository;
        _currentUser = currentUser;
    }

    public async Task<Result<bool>> Handle(
        BulkDeleteNotificationsCommand request,
        CancellationToken cancellationToken)
    {
        var userId = _currentUser.UserId;
        if (userId is null)
            return Result<bool>.Failure(
                new Error(ErrorType.Unauthorized, "Auth.Required", "Kimlik doğrulaması gerekli."));

        if (request.Ids.Count == 0)
            return Result<bool>.Failure(
                new Error(ErrorType.Validation, "Notification.EmptyIds", "En az bir bildirim ID'si gerekli."));

        await _repository.BulkSoftDeleteAsync(request.Ids, userId.Value, cancellationToken);
        return Result<bool>.Success(true);
    }
}
