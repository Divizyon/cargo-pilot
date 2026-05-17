namespace CargoPilot.Domain.Entities;

public sealed class LoadingPlanVehicle {
    public Guid LoadingPlanId { get; private set; }
    public Guid VehicleId { get; private set; }
    public int SortOrder { get; private set; }

    public Vehicle Vehicle { get; private set; } = null!;
#pragma warning disable S1144
    public LoadingPlan LoadingPlan { get; private set; } = null!;
#pragma warning restore S1144

    private LoadingPlanVehicle() { }

    public LoadingPlanVehicle(Guid loadingPlanId, Guid vehicleId, int sortOrder) {
        LoadingPlanId = loadingPlanId;
        VehicleId = vehicleId;
        SortOrder = sortOrder;
    }

    public void UpdateSortOrder(int sortOrder) => SortOrder = sortOrder;
}
