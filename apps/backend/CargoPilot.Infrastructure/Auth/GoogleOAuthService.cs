using System.Net.Http.Json;
using System.Text.Json.Serialization;
using CargoPilot.Application.Common.Interfaces;
using Microsoft.Extensions.Configuration;

namespace CargoPilot.Infrastructure.Auth;

/// <summary>
/// Google OAuth server-side redirect akışını yönetir.
/// Config anahtarları: OAuth:Google:ClientId, OAuth:Google:ClientSecret, OAuth:Google:CallbackUrl
/// </summary>
internal sealed class GoogleOAuthService : IGoogleOAuthService
{
    private readonly string? _clientId;
    private readonly string? _clientSecret;
    private readonly string? _callbackUrl;
    private readonly HttpClient _httpClient;

    private const string AuthorizationEndpoint = "https://accounts.google.com/o/oauth2/v2/auth";
    private const string TokenEndpoint = "https://oauth2.googleapis.com/token";

    public GoogleOAuthService(IConfiguration configuration, HttpClient httpClient)
    {
        _clientId = configuration["OAuth:Google:ClientId"];
        _clientSecret = configuration["OAuth:Google:ClientSecret"];
        _callbackUrl = configuration["OAuth:Google:CallbackUrl"];
        _httpClient = httpClient;
    }

    public string BuildAuthorizationUrl(string state)
    {
        var query = new Dictionary<string, string?>
        {
            ["client_id"] = _clientId ?? string.Empty,
            ["redirect_uri"] = _callbackUrl ?? string.Empty,
            ["response_type"] = "code",
            ["scope"] = "openid email profile",
            ["state"] = state,
            ["access_type"] = "offline",
            ["prompt"] = "select_account",
        };

        var queryString = string.Join("&",
            query.Select(kv => $"{Uri.EscapeDataString(kv.Key)}={Uri.EscapeDataString(kv.Value ?? string.Empty)}"));

        return $"{AuthorizationEndpoint}?{queryString}";
    }

    public async Task<string?> ExchangeCodeForIdTokenAsync(string code, CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(_clientId) ||
            string.IsNullOrWhiteSpace(_clientSecret) ||
            string.IsNullOrWhiteSpace(_callbackUrl))
            return null;

        var body = new FormUrlEncodedContent(new Dictionary<string, string?>
        {
            ["code"] = code,
            ["client_id"] = _clientId,
            ["client_secret"] = _clientSecret,
            ["redirect_uri"] = _callbackUrl,
            ["grant_type"] = "authorization_code",
        });

        try
        {
            var response = await _httpClient.PostAsync(TokenEndpoint, body, cancellationToken);
            if (!response.IsSuccessStatusCode)
                return null;

            var tokenResponse = await response.Content.ReadFromJsonAsync<GoogleTokenResponse>(cancellationToken: cancellationToken);
            return tokenResponse?.IdToken;
        }
        catch (Exception ex) when (ex is HttpRequestException or TaskCanceledException or System.Text.Json.JsonException)
        {
            return null;
        }
    }

    private sealed record GoogleTokenResponse(
        [property: JsonPropertyName("id_token")] string? IdToken,
        [property: JsonPropertyName("access_token")] string? AccessToken,
        [property: JsonPropertyName("token_type")] string? TokenType);
}
