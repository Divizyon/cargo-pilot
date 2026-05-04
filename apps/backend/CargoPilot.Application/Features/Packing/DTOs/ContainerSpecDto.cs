namespace CargoPilot.Application.Features.Packing.DTOs;

public sealed record ContainerSpecDto(
    decimal Length,
    decimal Width,
    decimal Height,
    decimal MaxWeight,
    string VehicleType = "container");
