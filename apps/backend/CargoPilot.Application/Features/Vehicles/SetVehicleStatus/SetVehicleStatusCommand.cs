using CargoPilot.Application.Common.Models;
using MediatR;

namespace CargoPilot.Application.Features.Vehicles.SetVehicleStatus;

public sealed record SetVehicleStatusCommand(Guid Id, bool IsActive) : IRequest<Result<Guid>>;
