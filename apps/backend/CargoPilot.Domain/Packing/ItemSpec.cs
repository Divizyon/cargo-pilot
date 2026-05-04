namespace CargoPilot.Domain.Packing;

public sealed record ItemSpec(
    string Id,
    string Name,
    decimal Length,
    decimal Width,
    decimal Height,
    decimal Weight,
    bool IsStackable,
    decimal MaxWeightOnTop,
    int? LifoIndex);
