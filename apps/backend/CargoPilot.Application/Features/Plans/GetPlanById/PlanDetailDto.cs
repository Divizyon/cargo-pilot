using CargoPilot.Domain.Enums;

namespace CargoPilot.Application.Features.Plans.GetPlanById;

public sealed record PlanDetailDto(
    Guid Id,
    string PlanName,
    LoadingPlanOptimizationStatus OptimizationStatus,
    LoadingPlanOptimizationCriteria OptimizationCriteria,
    string? ErrorCode,
    string? ErrorMessage,
    decimal TotalWeight,
    decimal FillRate,
    int InputTotalQuantity,
    int PlacedQuantity,
    int UnplacedQuantity,
    decimal? CenterOfGravityX,
    decimal? CenterOfGravityY,
    decimal? CenterOfGravityZ,
    decimal? WeightBalanceOffsetX,
    decimal? WeightBalanceOffsetZ,
    DateTime CreatedAtUtc,
    ErpExportStatus? ErpExportStatus,
    // Son ERP aktarim denemesinin hata nedeni; basarili ya da hic denenmemis aktarimda null.
    string? ErpExportMessage,
    string? ThumbnailUrl,
    VehicleInPlanDto Vehicle,
    IReadOnlyList<PlacementDto> Placements,
    IReadOnlyList<UnplacedItemDto> UnplacedItems,
    IReadOnlyList<WarningDto> Warnings,
    IReadOnlyList<InputItemDto> InputItems,
    IReadOnlyList<PlanGroupDto> Groups);
