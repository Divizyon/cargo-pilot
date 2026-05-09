namespace CargoPilot.Application.Features.Vehicles.UpsertVehicleFromErp;

public sealed record ErpVehicleSyncResultDto(
    int Added,
    int Updated,
    int Skipped);