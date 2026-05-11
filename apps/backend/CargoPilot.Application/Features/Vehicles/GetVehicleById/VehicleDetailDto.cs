using CargoPilot.Application.Features.Vehicles.SearchVehicles;
using CargoPilot.Domain.Enums;

namespace CargoPilot.Application.Features.Vehicles.GetVehicleById;

public sealed record VehicleDetailDto(
    Guid Id,
    string VehicleName,
    string? Description,
    VehicleType VehicleType,
    string PlateNumber,
    decimal InternalWidth,
    decimal InternalHeight,
    decimal InternalLength,
    decimal MaxWeightCapacity,
    int LayerCount,
    LoadingType LoadingType,
    decimal Volume,
    bool IsActive,
    Guid? CompanyId,
    decimal? KingPinDistanceMm,
    decimal? KingPinTareWeightKg,
    decimal? KingPinMaxLoadKg,
    decimal? MainAxleDistanceMm,
    decimal? MainAxleTareWeightKg,
    decimal? MainAxleMaxLoadKg,
    decimal? AdditionalAxleDistanceMm,
    decimal? AdditionalAxleTareWeightKg,
    decimal? AdditionalAxleMaxLoadKg,
    DateTime CreatedAtUtc,
    AuditUserDto? CreatedBy,
    DateTime? UpdatedAtUtc,
    AuditUserDto? UpdatedBy);
