using CargoPilot.Application.Abstractions;
using CargoPilot.Application.Common.Interfaces;
using CargoPilot.Application.Common.Models;
using MediatR;

namespace CargoPilot.Application.Features.Me.UpdateTourCompleted;

internal sealed class UpdateTourCompletedCommandHandler
    : IRequestHandler<UpdateTourCompletedCommand, Result<bool>> {
    private readonly IUserRepository _userRepository;
    private readonly ICurrentUserService _currentUserService;

    public UpdateTourCompletedCommandHandler(
        IUserRepository userRepository,
        ICurrentUserService currentUserService) {
        _userRepository = userRepository;
        _currentUserService = currentUserService;
    }

    public async Task<Result<bool>> Handle(
        UpdateTourCompletedCommand request,
        CancellationToken cancellationToken) {
        if (_currentUserService.UserId is not { } userId)
            return Result<bool>.Failure(
                new Error(ErrorType.Unauthorized, "AUTH_UNAUTHORIZED", "Kimlik doÄŸrulamasÄ± gereklidir."));

        var user = await _userRepository.GetByIdAsync(userId, cancellationToken);
        if (user is null)
            return Result<bool>.Failure(
                new Error(ErrorType.NotFound, "USER_NOT_FOUND", "KullanÄ±cÄ± bulunamadÄ±."));

        user.SetTourCompleted(request.TourCompleted);

        await _userRepository.SaveChangesAsync(cancellationToken);

        return Result<bool>.Success(user.TourCompleted);
    }
}
