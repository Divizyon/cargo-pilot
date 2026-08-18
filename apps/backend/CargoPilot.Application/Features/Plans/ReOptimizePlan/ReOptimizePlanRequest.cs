using CargoPilot.Domain.Enums;

namespace CargoPilot.Application.Features.Plans.ReOptimizePlan;

public sealed record ReOptimizePlanRequest(
    Guid VehicleId,
    IReadOnlyList<ReOptimizePlanItemRequest> Items,
    LoadingPlanOptimizationCriteria OptimizationCriteria = LoadingPlanOptimizationCriteria.VolumeFirst,
    IReadOnlyList<ReOptimizePlanGroupDefinition>? Groups = null,
    bool ClusterGroups = true,
    PlacementStrategy PlacementStrategy = PlacementStrategy.WallBuilder,
    SequencerKind? Sequencer = null,
    int Seed = 0);

public sealed record ReOptimizePlanGroupDefinition(
    Guid ClientGroupId,
    string Name,
    string Color,
    int UnloadingOrder);
