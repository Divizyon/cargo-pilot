namespace CargoPilot.Application.Features.Me.GetMyProfile;

public sealed record GetMyProfileResponse(
    Guid UserId,
    string FirstName,
    string LastName,
    string FullName,
    string Email,
    string? CompanyName);
