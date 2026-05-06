using CargoPilot.Application.Common.Models;
using CargoPilot.Application.Features.Auth.DTOs;
using CargoPilot.Domain.Enums;

namespace CargoPilot.Application.Features.Auth;

public interface IAuthService
{
    Task<Result<LoginResponse>> LoginAsync(
        LoginRequest request,
        string? ipAddress,
        string? userAgent,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// OAuth ID token'ı doğrular; kullanıcıyı bulur veya oluşturur ve JWT döner.
    /// AC9: Token geçerliliği, AC10: Yeni kayıt, AC11: Hesap birleştirme.
    /// </summary>
    Task<Result<LoginResponse>> OAuthLoginAsync(
        string idToken,
        AuthProvider provider,
        string? ipAddress,
        string? userAgent,
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

    /// <summary>
    /// "Bu giriş benim değil" akışı: token doğrulanır, tüm aktif oturumlar iptal edilir
    /// ve kullanıcı şifre sıfırlama sayfasına yönlendirme URL'si ile döner.
    /// AC3: Hesap güvenceye alma.
    /// </summary>
    Task<Result<string>> SecureAccountAsync(
        string email,
        string token,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Gelen refresh token'a ait oturumu iptal eder.
    /// Token bulunamazsa veya zaten iptal edilmişse yine başarı döner (idempotent).
    /// </summary>
    Task<Result<bool>> LogoutAsync(
        string refreshToken,
        CancellationToken cancellationToken = default);
}