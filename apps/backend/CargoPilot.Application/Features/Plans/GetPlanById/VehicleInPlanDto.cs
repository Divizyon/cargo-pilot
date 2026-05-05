using CargoPilot.Domain.Enums;

namespace CargoPilot.Application.Features.Plans.GetPlanById;

public sealed record VehicleInPlanDto(
    Guid Id,
    string VehicleName,
    string PlateNumber,
    VehicleType VehicleType,
    decimal InternalWidth,
    decimal InternalHeight,
    decimal InternalLength,
    decimal MaxWeightCapacity);
