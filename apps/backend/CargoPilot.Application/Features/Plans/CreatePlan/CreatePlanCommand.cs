using CargoPilot.Application.Common.Models;
using CargoPilot.Domain.Enums;
using MediatR;

namespace CargoPilot.Application.Features.Plans.CreatePlan;

public sealed record CreatePlanCommand(
    string PlanName,
    IReadOnlyList<Guid> VehicleIds,
    IReadOnlyList<CreatePlanItemRequest> Items,
    LoadingPlanOptimizationCriteria OptimizationCriteria = LoadingPlanOptimizationCriteria.VolumeFirst,
    IReadOnlyList<CreatePlanGroupDefinition>? Groups = null,
    bool ClusterGroups = true)
    : IRequest<Result<Guid>>;

public sealed record CreatePlanGroupDefinition(
    Guid ClientGroupId,
    string Name,
    string Color,
    int UnloadingOrder);
