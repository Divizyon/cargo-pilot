namespace CargoPilot.Application.Features.Plans.ReorderPlanVehicles;

public sealed record ReorderPlanVehiclesRequest(IReadOnlyList<Guid> VehicleIds);
