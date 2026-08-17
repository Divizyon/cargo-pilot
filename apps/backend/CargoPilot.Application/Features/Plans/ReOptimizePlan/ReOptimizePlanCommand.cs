using CargoPilot.Application.Common.Models;
using CargoPilot.Domain.Enums;
using MediatR;

namespace CargoPilot.Application.Features.Plans.ReOptimizePlan;

public sealed record ReOptimizePlanCommand(
    Guid Id,
    Guid VehicleId,
    IReadOnlyList<ReOptimizePlanItemRequest> Items,
    LoadingPlanOptimizationCriteria OptimizationCriteria = LoadingPlanOptimizationCriteria.VolumeFirst,
    IReadOnlyList<ReOptimizePlanGroupDefinition>? Groups = null,
    bool ClusterGroups = true,
    PlacementStrategy PlacementStrategy = PlacementStrategy.Greedy,
    SequencerKind? Sequencer = null,
    int Seed = 0)
    : IRequest<Result<Guid>>;

public sealed record ReOptimizePlanItemRequest(Guid ItemId, int Quantity, Guid? GroupId = null);
