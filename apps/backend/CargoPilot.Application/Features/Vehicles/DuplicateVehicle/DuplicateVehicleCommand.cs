using CargoPilot.Application.Common.Models;
using MediatR;

namespace CargoPilot.Application.Features.Vehicles.DuplicateVehicle;

public sealed record DuplicateVehicleCommand(
    Guid Id,
    string VehicleName,
    string PlateNumber) : IRequest<Result<Guid>>;
