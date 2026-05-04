namespace CargoPilot.Domain.Packing;

public sealed record ContainerSpec(
    decimal Length,
    decimal Width,
    decimal Height,
    decimal MaxWeight);
