using CargoPilot.Application.Common.Models;
using MediatR;

namespace CargoPilot.Application.Features.Integrations.PendingItemMappings;

public sealed record DeletePendingItemMappingCommand(
    Guid IntegrationId,
    Guid MappingId) : IRequest<Result<bool>>;
