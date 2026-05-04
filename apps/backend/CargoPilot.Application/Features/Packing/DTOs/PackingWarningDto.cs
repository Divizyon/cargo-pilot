namespace CargoPilot.Application.Features.Packing.DTOs;

public sealed record PackingWarningDto(
    string ItemId,
    decimal DeltaX,
    decimal DeltaY,
    string Message);
