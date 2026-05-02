namespace CargoPilot.Application.Features.Vehicles.DuplicateVehicle;

public sealed record DuplicateVehicleRequest(
    string VehicleName,
    string PlateNumber);
