using CargoPilot.Application.Common.Models;
using MediatR;

namespace CargoPilot.Application.Features.Vehicles.AddVehicleFavorite;

public sealed record AddVehicleFavoriteCommand(Guid VehicleId) : IRequest<Result<bool>>;
