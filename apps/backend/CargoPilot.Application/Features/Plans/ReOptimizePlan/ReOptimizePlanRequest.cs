using CargoPilot.Domain.Enums;

namespace CargoPilot.Application.Features.Plans.ReOptimizePlan;

public sealed record ReOptimizePlanRequest(
    Guid VehicleId,
    IReadOnlyList<ReOptimizePlanItemRequest> Items,
    LoadingPlanOptimizationCriteria OptimizationCriteria = LoadingPlanOptimizationCriteria.VolumeFirst);
