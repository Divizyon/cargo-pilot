using CargoPilot.Domain.Enums;

namespace CargoPilot.Application.Features.Vehicles.SearchVehicles;

public sealed record VehicleSummaryDto(
    Guid Id,
    string VehicleName,
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
    AuditUserDto? LastModifiedBy,
    bool IsFavorite);
