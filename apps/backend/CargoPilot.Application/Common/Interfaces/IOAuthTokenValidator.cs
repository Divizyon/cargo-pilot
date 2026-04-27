namespace CargoPilot.Application.Common.Interfaces;

/// <summary>
/// Harici OAuth sağlayıcılarından gelen ID token'larını doğrular ve
/// kullanıcı bilgilerini normalize ederek döndürür.
/// </summary>
public interface IOAuthTokenValidator
{
    /// <summary>
    /// Verilen ID token'ı doğrular. Geçersizse null döner.
    /// </summary>
    Task<OAuthUserInfo?> ValidateAsync(string idToken, CancellationToken cancellationToken = default);
}

/// <summary>
/// OAuth sağlayıcısından normalize edilmiş kullanıcı bilgileri.
/// </summary>
/// <param name="Sub">Sağlayıcıya özgü benzersiz kullanıcı kimliği (provider key).</param>
/// <param name="Email">Doğrulanmış e-posta adresi.</param>
/// <param name="FirstName">Ad (null olabilir; sağlayıcı vermeyebilir).</param>
/// <param name="LastName">Soyad (null olabilir).</param>
public sealed record OAuthUserInfo(
    string Sub,
    string Email,
    string? FirstName,
    string? LastName);
