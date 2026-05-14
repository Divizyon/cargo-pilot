using CargoPilot.Application.Common.Models;
using MediatR;

namespace CargoPilot.Application.Features.Plans.ApprovePlan;

public sealed record ApprovePlanCommand(Guid PlanId) : IRequest<Result<Guid>>;
