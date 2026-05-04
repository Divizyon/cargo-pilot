namespace CargoPilot.Application.Features.Packing.DTOs;

public sealed record PackingParametersDto(
    bool LifoEnabled = false,
    decimal CgThresholdPercent = 15m);
