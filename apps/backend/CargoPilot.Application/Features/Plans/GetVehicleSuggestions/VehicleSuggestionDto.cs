using CargoPilot.Domain.Enums;

namespace CargoPilot.Application.Features.Plans.GetVehicleSuggestions;

public sealed record VehicleSuggestionDto(
    Guid Id,
    string VehicleName,
    string? PlateNumber,
    VehicleType VehicleType,
    decimal EstimatedFillRate,
    bool CanFitAll);
