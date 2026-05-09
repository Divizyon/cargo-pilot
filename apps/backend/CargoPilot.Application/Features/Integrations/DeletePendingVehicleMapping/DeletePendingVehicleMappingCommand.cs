using CargoPilot.Application.Common.Models;
using MediatR;

namespace CargoPilot.Application.Features.Integrations.DeletePendingVehicleMapping;

public sealed record DeletePendingVehicleMappingCommand(
    Guid IntegrationId,
    Guid MappingId) : IRequest<Result<Guid>>;