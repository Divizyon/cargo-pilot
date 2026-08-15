using CargoPilot.Domain.Enums;

namespace CargoPilot.Application.Common.Optimization;

internal sealed record PlacedBox(
    Guid ItemId,
    decimal X, decimal Y, decimal Z,
    decimal Width, decimal Height, decimal Length,
    LoadingPlanPlacementRotation Rotation,
    decimal Weight,
    bool IsStackable,
    int MaxStackCount,
    decimal MaxWeightOnTop,
    FragilityType FragilityType,
    int? UnloadingOrder);

internal sealed record UnplacedBox(Guid ItemId, UnplacedReason Reason);
