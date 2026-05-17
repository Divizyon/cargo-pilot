using CargoPilot.Domain.Enums;

namespace CargoPilot.Application.Features.Plans.GetPlans;

public sealed record VehicleInPlanListDto(
    Guid Id,
    string VehicleName,
    string PlateNumber,
    VehicleType VehicleType,
    int LoadingType,
    decimal InternalWidth,
    decimal InternalHeight,
    decimal InternalLength,
    decimal MaxWeightCapacity);
