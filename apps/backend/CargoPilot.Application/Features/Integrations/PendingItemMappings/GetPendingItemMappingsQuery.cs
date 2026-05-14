using CargoPilot.Application.Common.Models;
using CargoPilot.Domain.Enums;
using MediatR;

namespace CargoPilot.Application.Features.Integrations.PendingItemMappings;

public sealed record GetPendingItemMappingsQuery(
    Guid IntegrationId,
    PendingItemMappingStatus? Status,
    int Page = 1,
    int PageSize = 20) : IRequest<Result<PagedResult<PendingItemMappingDto>>>;
