using CargoPilot.Application.Common.Models;
using CargoPilot.Application.Features.Auth.DTOs;

namespace CargoPilot.Application.Features.Auth;

public interface IAuthService
{
    Task<Result<LoginResponse>> LoginAsync(
        LoginRequest request,
        string? ipAddress,
        CancellationToken cancellationToken = default);
}
