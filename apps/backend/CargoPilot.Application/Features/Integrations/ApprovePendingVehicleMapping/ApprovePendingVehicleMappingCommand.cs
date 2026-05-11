using CargoPilot.Application.Common.Models;
using MediatR;

namespace CargoPilot.Application.Features.Integrations.ApprovePendingVehicleMapping;

public sealed record ApprovePendingVehicleMappingCommand(
    Guid IntegrationId,
    Guid MappingId) : IRequest<Result<Guid>>;