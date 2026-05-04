namespace CargoPilot.Application.Features.Packing.DTOs;

public sealed record ItemSpecDto(
    string Id,
    string Name,
    decimal Length,
    decimal Width,
    decimal Height,
    decimal Weight,
    bool IsStackable,
    decimal MaxWeightOnTop,
    int? LifoIndex);
