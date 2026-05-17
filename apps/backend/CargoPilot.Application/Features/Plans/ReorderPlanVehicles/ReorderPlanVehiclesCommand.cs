using CargoPilot.Application.Common.Models;
using MediatR;

namespace CargoPilot.Application.Features.Plans.ReorderPlanVehicles;

public sealed record ReorderPlanVehiclesCommand(Guid PlanId, IReadOnlyList<Guid> VehicleIds)
    : IRequest<Result<Guid>>;
