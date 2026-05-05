using CargoPilot.Application.Common.Models;
using MediatR;

namespace CargoPilot.Application.Features.Plans.UpdatePlanName;

public sealed record UpdatePlanNameCommand(Guid Id, string PlanName) : IRequest<Result<Guid>>;
