using CargoPilot.Application.Common.Models;
using MediatR;

namespace CargoPilot.Application.Features.Vehicles.DeleteVehicle;

public sealed record DeleteVehicleCommand(Guid Id) : IRequest<Result<Guid>>;
