using CargoPilot.Application.Common.Models;
using CargoPilot.Domain.Enums;
using MediatR;

namespace CargoPilot.Application.Features.Plans.ReOptimizePlan;

public sealed record ReOptimizePlanCommand(
    Guid Id,
    IReadOnlyList<Guid> VehicleIds,
    IReadOnlyList<ReOptimizePlanItemRequest> Items,
    LoadingPlanOptimizationCriteria OptimizationCriteria = LoadingPlanOptimizationCriteria.VolumeFirst)
    : IRequest<Result<Guid>>;

public sealed record ReOptimizePlanItemRequest(Guid ItemId, int Quantity);
