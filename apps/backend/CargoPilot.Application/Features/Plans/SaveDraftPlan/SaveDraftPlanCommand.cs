using CargoPilot.Application.Common.Models;
using CargoPilot.Domain.Enums;
using MediatR;

namespace CargoPilot.Application.Features.Plans.SaveDraftPlan;

public sealed record SaveDraftPlanCommand(
    string? PlanName,
    Guid VehicleId,
    IReadOnlyList<SaveDraftPlanItemRequest> Items,
    LoadingPlanOptimizationCriteria OptimizationCriteria = LoadingPlanOptimizationCriteria.VolumeFirst)
    : IRequest<Result<Guid>>;
