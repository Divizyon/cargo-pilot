namespace CargoPilot.Application.Features.Packing.DTOs;

public sealed record CgFinalDto(
    decimal X,
    decimal Y,
    decimal Z,
    decimal DeviationX,
    decimal DeviationY);
