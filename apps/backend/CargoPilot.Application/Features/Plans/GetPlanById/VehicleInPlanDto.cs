using CargoPilot.Application.Features.Vehicles;
using CargoPilot.Domain.Enums;

namespace CargoPilot.Application.Features.Plans.GetPlanById;

/// <remarks>
/// <c>Doors</c> aracin kapilaridir. Tekil <c>LoadingType</c> tek bir kapiyi
/// ifade edebildigi icin arka + yan kapili aracin ikinci kapisi plan ekraninda
/// kayboluyordu; liste asil kaynaktir (docs/COORDINATE_STANDARD.md §4).
/// </remarks>
public sealed record VehicleInPlanDto(
    Guid Id,
    string VehicleName,
    string? PlateNumber,
    VehicleType VehicleType,
    LoadingType LoadingType,
    decimal? InternalWidth,
    decimal? InternalHeight,
    decimal? InternalLength,
    decimal? MaxWeightCapacity,
    IReadOnlyList<VehicleDoorDto> Doors);
