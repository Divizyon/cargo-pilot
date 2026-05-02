using CargoPilot.Application.Common.Models;
using MediatR;

namespace CargoPilot.Application.Features.Me.GetMyProfile;

public sealed record GetMyProfileQuery : IRequest<Result<GetMyProfileResponse>>;
