using CargoPilot.Application.Abstractions;
using CargoPilot.Application.Common.Interfaces;
using CargoPilot.Application.Common.Models;
using MediatR;

namespace CargoPilot.Application.Features.Notifications.GetUnreadCount;

public sealed class GetUnreadCountQueryHandler : IRequestHandler<GetUnreadCountQuery, Result<int>>
{
    private readonly INotificationRepository _repository;
    private readonly ICurrentUserService _currentUser;

    public GetUnreadCountQueryHandler(
        INotificationRepository repository,
        ICurrentUserService currentUser)
    {
        _repository  = repository;
        _currentUser = currentUser;
    }

    public async Task<Result<int>> Handle(GetUnreadCountQuery request, CancellationToken cancellationToken)
    {
        var userId = _currentUser.UserId;
        if (userId is null)
            return Result<int>.Failure(
                new Error(ErrorType.Unauthorized, "Auth.Required", "Kimlik doğrulaması gerekli."));

        var count = await _repository.GetUnreadCountAsync(userId.Value, cancellationToken);
        return Result<int>.Success(count);
    }
}
