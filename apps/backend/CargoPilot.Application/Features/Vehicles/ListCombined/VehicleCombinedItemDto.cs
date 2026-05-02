using CargoPilot.Domain.Enums;

namespace CargoPilot.Application.Features.Vehicles.ListCombined;

public sealed record VehicleCombinedItemDto(
    Guid Id,
    string VehicleName,
    VehicleType VehicleType,
    string PlateNumber,
    decimal MaxWeightCapacity,
    decimal Volume,
    int LayerCount,
    bool IsActive);
