using CargoPilot.Application.Abstractions;
using CargoPilot.Application.Common.Interfaces;
using CargoPilot.Application.Common.Models;
using MediatR;

namespace CargoPilot.Application.Features.Me.GetMyProfile;

internal sealed class GetMyProfileQueryHandler
    : IRequestHandler<GetMyProfileQuery, Result<GetMyProfileResponse>>
{
    private readonly IUserRepository _userRepository;
    private readonly ICurrentUserService _currentUserService;

    public GetMyProfileQueryHandler(
        IUserRepository userRepository,
        ICurrentUserService currentUserService)
    {
        _userRepository = userRepository;
        _currentUserService = currentUserService;
    }

    public async Task<Result<GetMyProfileResponse>> Handle(
        GetMyProfileQuery request,
        CancellationToken cancellationToken)
    {
        if (_currentUserService.UserId is not { } userId)
            return Result<GetMyProfileResponse>.Failure(
                new Error(ErrorType.Unauthorized, "AUTH_UNAUTHORIZED", "Kimlik doğrulaması gereklidir."));

        var user = await _userRepository.GetByIdAsync(userId, cancellationToken);
        if (user is null)
            return Result<GetMyProfileResponse>.Failure(
                new Error(ErrorType.NotFound, "USER_NOT_FOUND", "Kullanıcı bulunamadı."));

        return Result<GetMyProfileResponse>.Success(
            new GetMyProfileResponse(
                user.Id,
                user.FirstName,
                user.LastName,
                $"{user.FirstName} {user.LastName}",
                user.Email));
    }
}
