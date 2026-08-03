using CargoPilot.Application.Common.Models;
using MediatR;

namespace CargoPilot.Application.Features.Vehicles.RemoveVehicleFavorite;

public sealed record RemoveVehicleFavoriteCommand(Guid VehicleId) : IRequest<Result<bool>>;
