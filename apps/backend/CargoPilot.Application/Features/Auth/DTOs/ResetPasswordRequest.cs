namespace CargoPilot.Application.Features.Auth.DTOs;

public sealed record ResetPasswordRequest(string Token, string NewPassword);
