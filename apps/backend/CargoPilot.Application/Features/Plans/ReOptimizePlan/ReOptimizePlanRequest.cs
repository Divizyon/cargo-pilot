using CargoPilot.Domain.Enums;

namespace CargoPilot.Application.Features.Plans.ReOptimizePlan;

public sealed record ReOptimizePlanRequest(
    Guid VehicleId,
    IReadOnlyList<ReOptimizePlanItemRequest> Items,
    LoadingPlanOptimizationCriteria OptimizationCriteria = LoadingPlanOptimizationCriteria.VolumeFirst,
    IReadOnlyList<ReOptimizePlanGroupDefinition>? Groups = null,
    bool ClusterGroups = true,
    SequencerKind? Sequencer = null,
    int Seed = 0,
    // Mevcut yerlesimler yerinde kalsin, yalnizca yeni kutular yerlestirilsin.
    // Arayuzde plana urun eklendiginde kullanilir.
    bool KeepExistingPlacements = false);

public sealed record ReOptimizePlanGroupDefinition(
    Guid ClientGroupId,
    string Name,
    string Color,
    int UnloadingOrder);
