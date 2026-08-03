using CargoPilot.Application.Abstractions;
using CargoPilot.Application.Common.Interfaces;
using CargoPilot.Application.Common.Models;
using MediatR;

namespace CargoPilot.Application.Features.Notifications.MarkAllNotificationsRead;

public sealed class MarkAllNotificationsReadCommandHandler
    : IRequestHandler<MarkAllNotificationsReadCommand, Result<bool>>
{
    private readonly INotificationRepository _repository;
    private readonly ICurrentUserService _currentUser;

    public MarkAllNotificationsReadCommandHandler(
        INotificationRepository repository,
        ICurrentUserService currentUser)
    {
        _repository  = repository;
        _currentUser = currentUser;
    }

    public async Task<Result<bool>> Handle(
        MarkAllNotificationsReadCommand request,
        CancellationToken cancellationToken)
    {
        var userId = _currentUser.UserId;
        if (userId is null)
            return Result<bool>.Failure(
                new Error(ErrorType.Unauthorized, "Auth.Required", "Kimlik doğrulaması gerekli."));

        await _repository.MarkAllAsReadAsync(userId.Value, cancellationToken);
        return Result<bool>.Success(true);
    }
}
