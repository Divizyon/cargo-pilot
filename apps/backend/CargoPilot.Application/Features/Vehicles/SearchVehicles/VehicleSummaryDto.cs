using CargoPilot.Domain.Enums;

namespace CargoPilot.Application.Features.Vehicles.SearchVehicles;

public sealed record VehicleSummaryDto(
    Guid Id,
    string VehicleName,
    VehicleType VehicleType,
    string? PlateNumber,
    decimal InternalWidth,
    decimal InternalHeight,
    decimal InternalLength,
    decimal MaxWeightCapacity,
    int LayerCount,
    LoadingType LoadingType,
    decimal Volume,
    bool IsActive,
    bool IsFavorite,
    Guid? CompanyId,
    string? Description,
    decimal? KingPinDistanceMm,
    decimal? KingPinTareWeightKg,
    decimal? KingPinMaxLoadKg,
    decimal? MainAxleDistanceMm,
    decimal? MainAxleTareWeightKg,
    decimal? MainAxleMaxLoadKg,
    decimal? AdditionalAxleDistanceMm,
    decimal? AdditionalAxleTareWeightKg,
    decimal? AdditionalAxleMaxLoadKg,
    AuditUserDto? LastModifiedBy);