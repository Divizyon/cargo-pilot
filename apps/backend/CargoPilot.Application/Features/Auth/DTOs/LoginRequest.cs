namespace CargoPilot.Application.Features.Auth.DTOs;

public sealed record LoginRequest
{
    public string Email { get; init; } = string.Empty;
    public string Password { get; init; } = string.Empty;
}
