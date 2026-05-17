using CargoPilot.Domain.Enums;

namespace CargoPilot.Application.Features.Plans.GetPlans;

public sealed record VehicleSummaryInPlanDto(
    Guid VehicleId,
    string VehicleName,
    string? PlateNumber,
    VehicleType VehicleType,
    int SortOrder);
