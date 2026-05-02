using CargoPilot.Application.Common.Models;
using MediatR;

namespace CargoPilot.Application.Features.Vehicles.GetVehicleById;

public sealed record GetVehicleByIdQuery(Guid Id) : IRequest<Result<VehicleDetailDto>>;

public sealed record VehicleDetailDto(
    Guid Id,
    string VehicleName,
    string VehicleType,
    string PlateNumber,
    decimal InternalWidth,
    decimal InternalHeight,
    decimal InternalLength,
    decimal MaxWeightCapacity,
    decimal? KingPinDistanceMm,
    decimal? KingPinTareWeightKg,
    decimal? KingPinMaxLoadKg,
    decimal? MainAxleDistanceMm,
    decimal? MainAxleTareWeightKg,
    decimal? MainAxleMaxLoadKg,
    decimal? AdditionalAxleDistanceMm,
    decimal? AdditionalAxleTareWeightKg,
    decimal? AdditionalAxleMaxLoadKg,
    int LayerCount,
    string LoadingType,
    Guid? CompanyId,
    decimal Volume,
    DateTime CreatedAtUtc,
    DateTime? UpdatedAtUtc,
    Guid? CreatedBy,
    Guid? UpdatedBy);