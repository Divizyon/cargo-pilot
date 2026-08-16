using CargoPilot.Application.Common.Models;
using CargoPilot.Domain.Enums;
using MediatR;

namespace CargoPilot.Application.Features.Vehicles.UpdateVehicle;

public sealed record UpdateVehicleCommand(
    Guid Id,
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
    bool IsActive,
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
    IReadOnlyList<VehicleDoorDto>? Doors = null) : IRequest<Result<Guid>>;
