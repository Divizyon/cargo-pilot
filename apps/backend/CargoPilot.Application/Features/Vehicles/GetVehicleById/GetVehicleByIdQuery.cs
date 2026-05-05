using CargoPilot.Application.Common.Models;
using CargoPilot.Application.Features.Vehicles.SearchVehicles;
using MediatR;

namespace CargoPilot.Application.Features.Vehicles.GetVehicleById;

public sealed record GetVehicleByIdQuery(Guid Id) : IRequest<Result<VehicleDetailDto>>;

public sealed record VehicleDetailDto(
    Guid Id,
    string VehicleName,
    string? Description,
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
    bool IsActive,
    DateTime CreatedAtUtc,
    DateTime? UpdatedAtUtc,
    AuditUserDto? CreatedBy,
    AuditUserDto? UpdatedBy);