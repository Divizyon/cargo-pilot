using System.Text.Json;
using CargoPilot.Application.Common.Interfaces;
using Microsoft.Extensions.Configuration;

namespace CargoPilot.Infrastructure.Auth;

internal sealed class GoogleOAuthService : IGoogleOAuthService
{
    private readonly HttpClient _httpClient;
    private readonly string _clientId;
    private readonly string _clientSecret;
    private readonly string _redirectUri;

    public GoogleOAuthService(HttpClient httpClient, IConfiguration configuration)
    {
        _httpClient = httpClient;
        _clientId = configuration["OAuth:Google:ClientId"] ?? string.Empty;
        _clientSecret = configuration["OAuth:Google:ClientSecret"] ?? string.Empty;
        _redirectUri = configuration["OAuth:Google:CallbackUrl"] ?? string.Empty;
    }

    public string BuildAuthorizationUrl(string state)
    {
        var query = new Dictionary<string, string>
        {
            ["client_id"]     = _clientId,
            ["redirect_uri"]  = _redirectUri,
            ["response_type"] = "code",
            ["scope"]         = "openid email profile",
            ["state"]         = state,
            ["access_type"]   = "online",
        };

        var qs = string.Join("&", query.Select(kv =>
            $"{Uri.EscapeDataString(kv.Key)}={Uri.EscapeDataString(kv.Value)}"));

#pragma warning disable S1075
        return $"https://accounts.google.com/o/oauth2/v2/auth?{qs}";
#pragma warning restore S1075
    }

    public async Task<string?> ExchangeCodeForIdTokenAsync(string code, CancellationToken cancellationToken = default)
    {
        var body = new FormUrlEncodedContent(new Dictionary<string, string>
        {
            ["code"]          = code,
            ["client_id"]     = _clientId,
            ["client_secret"] = _clientSecret,
            ["redirect_uri"]  = _redirectUri,
            ["grant_type"]    = "authorization_code",
        });

#pragma warning disable S1075
        var response = await _httpClient.PostAsync("https://oauth2.googleapis.com/token", body, cancellationToken);
#pragma warning restore S1075
        if (!response.IsSuccessStatusCode)
            return null;

        var json = await response.Content.ReadAsStreamAsync(cancellationToken);
        using var doc = await JsonDocument.ParseAsync(json, cancellationToken: cancellationToken);

        return doc.RootElement.TryGetProperty("id_token", out var idTokenElement)
            ? idTokenElement.GetString()
            : null;
    }
}
