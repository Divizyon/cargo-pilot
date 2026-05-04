namespace CargoPilot.Domain.Packing;

public sealed record PackingParameters(
    bool LifoEnabled,
    decimal CgThresholdPercent = 15m);
