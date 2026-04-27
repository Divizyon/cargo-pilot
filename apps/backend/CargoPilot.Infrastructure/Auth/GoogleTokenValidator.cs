using CargoPilot.Application.Common.Interfaces;
using Google.Apis.Auth;
using Microsoft.Extensions.Configuration;

namespace CargoPilot.Infrastructure.Auth;

/// <summary>
/// Google ID token'ını Google'ın kendi kütüphanesiyle doğrular.
/// Client ID, appsettings "OAuth:Google:ClientId" anahtarından okunur.
/// </summary>
internal sealed class GoogleTokenValidator : IOAuthTokenValidator
{
    private readonly string? _clientId;

    public GoogleTokenValidator(IConfiguration configuration)
    {
        _clientId = configuration["OAuth:Google:ClientId"];
    }

    public async Task<OAuthUserInfo?> ValidateAsync(string idToken, CancellationToken cancellationToken = default)
    {
        try
        {
            var settings = new GoogleJsonWebSignature.ValidationSettings();

            // ClientId dolu geldiğinde audience doğrulaması da yapılır.
            // Boş (geliştirme ortamı) ise audience kontrolü atlanır.
            if (!string.IsNullOrWhiteSpace(_clientId))
                settings.Audience = [_clientId];

            var payload = await GoogleJsonWebSignature.ValidateAsync(idToken, settings);

            return new OAuthUserInfo(
                Sub: payload.Subject,
                Email: payload.Email,
                FirstName: payload.GivenName,
                LastName: payload.FamilyName);
        }
        catch (InvalidJwtException)
        {
            // Geçersiz / süresi dolmuş / imza hatalı token
            return null;
        }
    }
}
