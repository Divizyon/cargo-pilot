namespace CargoPilot.Application.Features.Packing.DTOs;

public sealed record PlacementDto(
    string ItemId,
    string ItemName,
    decimal X,
    decimal Y,
    decimal Z,
    RotationDto Rotation);

public sealed record RotationDto(decimal L, decimal W, decimal H);
