using CargoPilot.Application.Common.Models;
using CargoPilot.Application.Features.Auth.DTOs;

namespace CargoPilot.Application.Features.Auth;

public interface IAuthService
{
    /// <summary>
    /// Google ID token doğrulanır, kullanıcı bulunur veya oluşturulur,
    /// UserLogin bağlantısı kurulur ve standart JWT oturumu döndürülür.
    /// </summary>
    Task<Result<LoginResponse>> LoginWithGoogleAsync(
        string idToken,
        string? ipAddress,
        CancellationToken cancellationToken = default);

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

    /// <summary>
    /// E-posta adresine 10 dakika geçerli tek kullanımlık şifre sıfırlama linki gönderir.
    /// Hesap enumeration saldırılarını önlemek için e-posta kayıtlı olsun ya da olmasın
    /// aynı başarı yanıtı döner.
    /// </summary>
    Task<Result<bool>> RequestPasswordResetAsync(
        string email,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Geçerli sıfırlama tokeni ile yeni şifre belirlenir. Başarı durumunda
    /// kullanıcının tüm aktif oturumları iptal edilir.
    /// </summary>
    Task<Result<bool>> ResetPasswordAsync(
        string token,
        string newPassword,
        CancellationToken cancellationToken = default);
}
