using CargoPilot.Application.Common.Models;
using CargoPilot.Application.Features.Me.GetMyProfile;
using MediatR;

namespace CargoPilot.Application.Features.Me.UpdateMyProfile;

public sealed record UpdateMyProfileCommand(
    string FirstName,
    string LastName,
    string? CompanyName) : IRequest<Result<GetMyProfileResponse>>;
