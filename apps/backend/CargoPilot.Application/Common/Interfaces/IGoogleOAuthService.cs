namespace CargoPilot.Application.Common.Interfaces;

/// <summary>
/// Google OAuth server-side redirect akışı için yetkilendirme URL'i oluşturur
/// ve authorization code'u ID token ile exchange eder.
/// </summary>
public interface IGoogleOAuthService
{
    /// <summary>
    /// Kullanıcıyı Google giriş sayfasına yönlendirmek için gereken URL'i döner.
    /// state parametresi CSRF koruması için zorunludur.
    /// </summary>
    string BuildAuthorizationUrl(string state);

    /// <summary>
    /// Google'dan dönen authorization code'u ID token ile exchange eder.
    /// Exchange başarısız olursa null döner.
    /// </summary>
    Task<string?> ExchangeCodeForIdTokenAsync(string code, CancellationToken cancellationToken = default);
}
