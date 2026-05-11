using System.Text.Json.Serialization;

namespace CargoPilot.Application.Features.Auth.DTOs;

public sealed record ForceChangePasswordResponse
{
    public string AccessToken { get; init; } = null!;
    public DateTime AccessTokenExpiresAt { get; init; }

    [JsonIgnore]
    public string RefreshToken { get; init; } = null!;

    [JsonIgnore]
    public DateTime RefreshTokenExpiresAt { get; init; }
}
