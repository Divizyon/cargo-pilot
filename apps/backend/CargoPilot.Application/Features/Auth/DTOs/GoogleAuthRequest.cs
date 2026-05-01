namespace CargoPilot.Application.Features.Auth.DTOs;

public sealed record GoogleAuthRequest
{
    public string IdToken { get; init; } = string.Empty;
}
