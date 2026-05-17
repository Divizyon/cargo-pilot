using CargoPilot.Domain.Enums;

namespace CargoPilot.Application.Features.Plans.ReOptimizePlan;

public sealed record ReOptimizePlanRequest(
    IReadOnlyList<Guid> VehicleIds,
    IReadOnlyList<ReOptimizePlanItemRequest> Items,
    LoadingPlanOptimizationCriteria OptimizationCriteria = LoadingPlanOptimizationCriteria.VolumeFirst);
