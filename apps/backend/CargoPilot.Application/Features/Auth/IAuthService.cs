using CargoPilot.Application.Common.Models;
using CargoPilot.Application.Features.Auth.DTOs;
using CargoPilot.Domain.Enums;

namespace CargoPilot.Application.Features.Auth;

public interface IAuthService
{
    Task<Result<LoginResponse>> LoginAsync(
        LoginRequest request,
        string? ipAddress,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// OAuth ID token'ı doğrular; kullanıcıyı bulur veya oluşturur ve JWT döner.
    /// AC9: Token geçerliliği, AC10: Yeni kayıt, AC11: Hesap birleştirme.
    /// </summary>
    Task<Result<LoginResponse>> OAuthLoginAsync(
        string idToken,
        AuthProvider provider,
        string? ipAddress,
        CancellationToken cancellationToken = default);
}
