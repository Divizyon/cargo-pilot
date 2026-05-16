namespace CargoPilot.Application.Features.Plans.GetPlans;

public sealed record VehicleSummaryInPlanDto(
    Guid Id,
    string VehicleName,
    string PlateNumber,
    int SortOrder);
