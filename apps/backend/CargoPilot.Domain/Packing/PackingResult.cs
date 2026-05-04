namespace CargoPilot.Domain.Packing;

public sealed record PackingResult(
    IReadOnlyList<PackingPlacement> Placements,
    decimal CgFinalX,
    decimal CgFinalY,
    decimal CgFinalZ,
    decimal CgDeviationX,
    decimal CgDeviationY,
    decimal TotalWeight,
    decimal FillRatePercent,
    IReadOnlyList<PackingWarning> Warnings,
    IReadOnlyList<UnplacedItemResult> UnplacedItems,
    long ElapsedMilliseconds);
