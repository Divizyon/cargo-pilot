using CargoPilot.Domain.Enums;

namespace CargoPilot.Application.Features.Plans.GetPlans;

public sealed record PlanSummaryDto(
    Guid Id,
    string PlanName,
    LoadingPlanOptimizationStatus OptimizationStatus,
    LoadingPlanOptimizationCriteria OptimizationCriteria,
    decimal TotalWeight,
    decimal FillRate,
    int InputTotalQuantity,
    int PlacedQuantity,
    int UnplacedQuantity,
    Guid VehicleId,
    string VehicleName,
    DateTime CreatedAtUtc,
    string? ThumbnailUrl);
