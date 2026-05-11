using CargoPilot.Application.Common.Models;
using MediatR;

namespace CargoPilot.Application.Features.Vehicles.UpsertVehicleFromErp;

public sealed record UpsertVehicleFromErpCommand(
    Guid IntegrationId,
    IReadOnlyList<UpsertVehicleFromErpRequest> Vehicles) : IRequest<Result<ErpVehicleSyncResultDto>>;