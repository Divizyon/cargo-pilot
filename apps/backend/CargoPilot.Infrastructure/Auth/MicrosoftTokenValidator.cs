using CargoPilot.Application.Common.Interfaces;
using Microsoft.Extensions.Configuration;
using Microsoft.IdentityModel.Protocols;
using Microsoft.IdentityModel.Protocols.OpenIdConnect;
using Microsoft.IdentityModel.Tokens;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;

namespace CargoPilot.Infrastructure.Auth;

/// <summary>
/// Microsoft (Entra ID / Azure AD) ID token'ını OIDC discovery endpoint üzerinden
/// alınan public key'lerle doğrular.
/// ClientId ve TenantId appsettings "OAuth:Microsoft" bölümünden okunur.
/// </summary>
internal sealed class MicrosoftTokenValidator : IOAuthTokenValidator
{
    private readonly string? _clientId;
    private readonly string _tenantId;
    private readonly ConfigurationManager<OpenIdConnectConfiguration> _configManager;
    private static readonly JwtSecurityTokenHandler _tokenHandler = new();

    public MicrosoftTokenValidator(IConfiguration configuration)
    {
        _clientId = configuration["OAuth:Microsoft:ClientId"];
        _tenantId = configuration["OAuth:Microsoft:TenantId"] ?? "common";

        var metadataAddress =
            $"https://login.microsoftonline.com/{_tenantId}/v2.0/.well-known/openid-configuration";

        _configManager = new ConfigurationManager<OpenIdConnectConfiguration>(
            metadataAddress,
            new OpenIdConnectConfigurationRetriever(),
            new HttpDocumentRetriever { RequireHttps = true });
    }

    public async Task<OAuthUserInfo?> ValidateAsync(string idToken, CancellationToken cancellationToken = default)
    {
        try
        {
            var oidcConfig = await _configManager.GetConfigurationAsync(cancellationToken);

            var validationParameters = new TokenValidationParameters
            {
                ValidateIssuer           = true,
                ValidIssuers             = BuildValidIssuers(),
                ValidateAudience         = !string.IsNullOrWhiteSpace(_clientId),
                ValidAudience            = _clientId,
                ValidateLifetime         = true,
                IssuerSigningKeys        = oidcConfig.SigningKeys,
                ClockSkew                = TimeSpan.FromMinutes(5),
            };

            var principal = _tokenHandler.ValidateToken(
                idToken, validationParameters, out _);

            var sub   = GetClaim(principal, "sub")   ?? GetClaim(principal, ClaimTypes.NameIdentifier) ?? string.Empty;
            var email = GetClaim(principal, "email")  ?? GetClaim(principal, ClaimTypes.Email)          ?? string.Empty;

            if (string.IsNullOrWhiteSpace(sub) || string.IsNullOrWhiteSpace(email))
                return null;

            return new OAuthUserInfo(
                Sub: sub,
                Email: email,
                FirstName: GetClaim(principal, "given_name")  ?? GetClaim(principal, ClaimTypes.GivenName),
                LastName:  GetClaim(principal, "family_name") ?? GetClaim(principal, ClaimTypes.Surname));
        }
        catch (SecurityTokenException)
        {
            return null;
        }
    }

    // Microsoft v2.0 endpoint çoklu tenant için farklı issuer formatları kullanabilir.
    private IEnumerable<string> BuildValidIssuers() =>
    [
        $"https://login.microsoftonline.com/{_tenantId}/v2.0",
        $"https://sts.windows.net/{_tenantId}/",
    ];

    private static string? GetClaim(ClaimsPrincipal principal, string type)
        => principal.FindFirst(type)?.Value;
}
