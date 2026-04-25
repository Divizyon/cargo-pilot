namespace CargoPilot.Application.Features.Auth.Register;

public sealed record RegisterResponse(
    Guid UserId,
    string FirstName,
    string LastName,
    string Email);
