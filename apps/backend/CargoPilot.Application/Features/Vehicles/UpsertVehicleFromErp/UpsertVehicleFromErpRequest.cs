using CargoPilot.Domain.Enums;

namespace CargoPilot.Application.Features.Vehicles.UpsertVehicleFromErp;

public sealed record UpsertVehicleFromErpRequest(
    string ErpId,
    Guid IntegrationId,
    string VehicleName,
    VehicleType VehicleType,
    string PlateNumber,
    decimal InternalWidth,
    decimal InternalHeight,
    decimal InternalLength,
    decimal MaxWeightCapacity,
    int LayerCount,
    LoadingType LoadingType,
    Guid? CompanyId,
    string? Description = null,
    decimal? KingPinDistanceMm = null,
    decimal? KingPinTareWeightKg = null,
    decimal? KingPinMaxLoadKg = null,
    decimal? MainAxleDistanceMm = null,
    decimal? MainAxleTareWeightKg = null,
    decimal? MainAxleMaxLoadKg = null,
    decimal? AdditionalAxleDistanceMm = null,
    decimal? AdditionalAxleTareWeightKg = null,
    decimal? AdditionalAxleMaxLoadKg = null);