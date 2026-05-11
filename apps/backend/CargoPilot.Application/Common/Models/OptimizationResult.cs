using CargoPilot.Domain.Enums;

namespace CargoPilot.Application.Common.Models;

public sealed record OptimizationResult(
    IReadOnlyList<PlacedItemResult> Placements,
    IReadOnlyList<UnplacedItemResult> UnplacedItems,
    decimal TotalWeight,
    decimal FillRate,
    decimal? CenterOfGravityX,
    decimal? CenterOfGravityY,
    decimal? CenterOfGravityZ,
    decimal? WeightBalanceOffsetX,
    decimal? WeightBalanceOffsetZ);

public sealed record PlacedItemResult(
    Guid PlacementId,
    Guid ItemId,
    decimal X,
    decimal Y,
    decimal Z,
    decimal Width,
    decimal Height,
    decimal Depth,
    LoadingPlanPlacementRotation Rotation,
    decimal Weight);

public sealed record UnplacedItemResult(
    Guid ItemId,
    int Quantity,
    UnplacedReason Reason);
