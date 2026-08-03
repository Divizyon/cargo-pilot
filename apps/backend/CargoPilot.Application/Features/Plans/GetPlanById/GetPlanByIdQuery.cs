using CargoPilot.Application.Common.Models;
using MediatR;

namespace CargoPilot.Application.Features.Plans.GetPlanById;

public sealed record GetPlanByIdQuery(Guid Id) : IRequest<Result<PlanDetailDto>>;
