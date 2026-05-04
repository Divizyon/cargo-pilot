namespace CargoPilot.Domain.Packing;

public sealed record PackingPlacement(
    string ItemId,
    string ItemName,
    decimal X,
    decimal Y,
    decimal Z,
    Rotation Rotation);
