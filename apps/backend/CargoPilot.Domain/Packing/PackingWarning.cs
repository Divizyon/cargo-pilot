namespace CargoPilot.Domain.Packing;

public sealed record PackingWarning(
    string ItemId,
    decimal DeltaX,
    decimal DeltaY,
    string Message);
