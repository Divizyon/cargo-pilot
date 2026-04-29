using CargoPilot.Application.Common.Models;
using CargoPilot.Application.Features.Auth.DTOs;

namespace CargoPilot.Application.Features.Auth;

public interface IAuthService
{
    Task<Result<LoginResponse>> LoginAsync(
        LoginRequest request,
        string? ipAddress,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Gelen refresh token doğrulanır, eski session revoke edilir (Token Rotation),
    /// yeni bir access + refresh token çifti üretilir.
    /// </summary>
    Task<Result<RefreshResponse>> RefreshTokenAsync(
        string refreshToken,
        string? ipAddress,
        CancellationToken cancellationToken = default);
}
