using CargoPilot.Application.Common.Models;
using MediatR;

namespace CargoPilot.Application.Features.Integrations.PendingItemMappings;

public sealed record ApprovePendingItemMappingCommand(
    Guid IntegrationId,
    Guid MappingId,
    Guid CargoPilotItemId) : IRequest<Result<bool>>;
