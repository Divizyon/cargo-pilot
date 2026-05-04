namespace CargoPilot.Application.Features.Packing.DTOs;

public sealed record PackingResultDto(
    IReadOnlyList<PlacementDto> Placements,
    CgFinalDto CgFinal,
    decimal TotalWeight,
    decimal FillRatePercent,
    int PlacedCount,
    int UnplacedCount,
    IReadOnlyList<PackingWarningDto> Warnings,
    IReadOnlyList<UnplacedItemDto> UnplacedItems,
    long ElapsedMilliseconds);
