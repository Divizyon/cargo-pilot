namespace CargoPilot.Domain.Packing;

public sealed record PlacedItem(
    string ItemId,
    ExtremePoint Position,
    Rotation Rotation,
    decimal Weight,
    bool IsStackable,
    decimal MaxWeightOnTop,
    decimal CurrentStackLoad);
