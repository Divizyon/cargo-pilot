using CargoPilot.Domain.Enums;

namespace CargoPilot.Application.Features.Vehicles.CreateVehicle;

// Doors: aracin kapilari (docs/COORDINATE_STANDARD.md §4). Verilmezse tekil
// LoadingType'dan turetilir; gecis tamamlanana kadar iki yol da desteklenir.
public sealed record CreateVehicleRequest(
    string VehicleName,
    string? Description,
    VehicleType VehicleType,
    string? PlateNumber,
    decimal? InternalWidth,
    decimal? InternalHeight,
    decimal? InternalLength,
    decimal? MaxWeightCapacity,
    int LayerCount,
    LoadingType LoadingType,
    decimal? KingPinDistanceMm,
    decimal? KingPinTareWeightKg,
    decimal? KingPinMaxLoadKg,
    decimal? MainAxleDistanceMm,
    decimal? MainAxleTareWeightKg,
    decimal? MainAxleMaxLoadKg,
    decimal? AdditionalAxleDistanceMm,
    decimal? AdditionalAxleTareWeightKg,
    decimal? AdditionalAxleMaxLoadKg,
    bool? IsDraft = null,
    IReadOnlyList<VehicleDoorDto>? Doors = null);
