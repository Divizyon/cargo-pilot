using CargoPilot.Application.Common.Models;
using MediatR;

namespace CargoPilot.Application.Features.Shares.CreateShareLink;

public sealed record CreateShareLinkCommand(Guid PlanId, string Validity) : IRequest<Result<ShareLinkDto>>;
