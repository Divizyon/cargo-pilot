using System.Text.Json.Serialization;

namespace CargoPilot.Application.Features.Auth.DTOs;

public sealed record LoginResponse
{
    public Guid UserId { get; init; }
    public string Email { get; init; } = null!;
    public string FullName { get; init; } = null!;
    public string Role { get; init; } = null!;
    public Guid? CompanyId { get; init; }
    public string AccessToken { get; init; } = null!;
    public DateTime AccessTokenExpiresAt { get; init; }

    /// <summary>
    /// Controller tarafından HttpOnly Cookie'ye yazılır; JSON body'de gözükmez.
    /// </summary>
    [JsonIgnore]
    public string RefreshToken { get; init; } = null!;

    /// <summary>
    /// Cookie sona erme zamanı için controller tarafından kullanılır; JSON body'de gözükmez.
    /// </summary>
    [JsonIgnore]
    public DateTime RefreshTokenExpiresAt { get; init; }
}
