using CargoPilot.Application.Common.Models;
using CargoPilot.Application.Features.Plans.GetPlanById;
using CargoPilot.Domain.Enums;
using MediatR;

namespace CargoPilot.Application.Features.Plans.CreatePlan;

public sealed record CreatePlanCommand(
    string PlanName,
    Guid VehicleId,
    IReadOnlyList<CreatePlanItemRequest> Items,
    LoadingPlanOptimizationCriteria OptimizationCriteria = LoadingPlanOptimizationCriteria.VolumeFirst)
    : IRequest<Result<PlanDetailDto>>;
