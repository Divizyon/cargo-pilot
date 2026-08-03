using System.Text.Json.Serialization;

namespace CargoPilot.Application.Features.Auth.DTOs;

/// <summary>
/// POST /api/v1/auth/refresh başarılı yanıtı.
/// Yeni refresh token HttpOnly Cookie olarak taşındığından response body'de yer almaz;
/// ancak controller'ın cookie set edebilmesi için bu DTO üzerinden taşınır.
/// </summary>
public sealed record RefreshResponse
{
    /// <summary>Yeni üretilen kısa ömürlü access token (JWT).</summary>
    public string AccessToken { get; init; } = null!;

    /// <summary>Access token'ın UTC bazlı sona erme zamanı.</summary>
    public DateTime AccessTokenExpiresAt { get; init; }

    /// <summary>
    /// Yeni refresh token — controller tarafından HttpOnly Cookie'ye yazılır.
    /// JSON body'ye yazılmaz; tarayıcının JS ortamı bu değeri okuyamaz.
    /// </summary>
    [JsonIgnore]
    public string RefreshToken { get; init; } = null!;

    /// <summary>
    /// Refresh token'ın sona erme zamanı — yalnızca cookie ayarı için kullanılır.
    /// </summary>
    [JsonIgnore]
    public DateTime RefreshTokenExpiresAt { get; init; }
}
