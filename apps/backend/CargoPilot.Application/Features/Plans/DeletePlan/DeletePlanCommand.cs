using CargoPilot.Application.Common.Models;
using MediatR;

namespace CargoPilot.Application.Features.Plans.DeletePlan;

public sealed record DeletePlanCommand(Guid Id) : IRequest<Result<Guid>>;
