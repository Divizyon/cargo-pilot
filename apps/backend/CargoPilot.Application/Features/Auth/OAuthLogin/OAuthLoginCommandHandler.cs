using CargoPilot.Application.Common.Models;
using CargoPilot.Application.Features.Auth.DTOs;
using MediatR;

namespace CargoPilot.Application.Features.Auth.OAuthLogin;

public sealed class OAuthLoginCommandHandler : IRequestHandler<OAuthLoginCommand, Result<LoginResponse>>
{
    private readonly IAuthService _authService;

    public OAuthLoginCommandHandler(IAuthService authService)
    {
        _authService = authService;
    }

    public Task<Result<LoginResponse>> Handle(OAuthLoginCommand request, CancellationToken cancellationToken)
    {
        return _authService.OAuthLoginAsync(
            request.IdToken,
            request.Provider,
            request.IpAddress,
            cancellationToken);
    }
}
