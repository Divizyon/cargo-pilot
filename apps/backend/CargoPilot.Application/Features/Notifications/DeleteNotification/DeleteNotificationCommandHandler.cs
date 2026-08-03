using CargoPilot.Application.Abstractions;
using CargoPilot.Application.Common.Interfaces;
using CargoPilot.Application.Common.Models;
using MediatR;

namespace CargoPilot.Application.Features.Notifications.DeleteNotification;

public sealed class DeleteNotificationCommandHandler
    : IRequestHandler<DeleteNotificationCommand, Result<bool>>
{
    private readonly INotificationRepository _repository;
    private readonly ICurrentUserService _currentUser;

    public DeleteNotificationCommandHandler(
        INotificationRepository repository,
        ICurrentUserService currentUser)
    {
        _repository  = repository;
        _currentUser = currentUser;
    }

    public async Task<Result<bool>> Handle(
        DeleteNotificationCommand request,
        CancellationToken cancellationToken)
    {
        var userId = _currentUser.UserId;
        if (userId is null)
            return Result<bool>.Failure(
                new Error(ErrorType.Unauthorized, "Auth.Required", "Kimlik doğrulaması gerekli."));

        var notification = await _repository.GetByIdAsync(request.Id, cancellationToken);
        if (notification is null)
            return Result<bool>.Failure(
                new Error(ErrorType.NotFound, "Notification.NotFound", "Bildirim bulunamadı."));

        if (notification.UserId != userId.Value)
            return Result<bool>.Failure(
                new Error(ErrorType.Forbidden, "Notification.Forbidden", "Bu bildirime erişim yetkiniz yok."));

        await _repository.SoftDeleteAsync(request.Id, userId.Value, cancellationToken);
        await _repository.SaveChangesAsync(cancellationToken);

        return Result<bool>.Success(true);
    }
}
