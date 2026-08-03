using CargoPilot.Application.Common.Models;
using MediatR;

namespace CargoPilot.Application.Features.Integrations.SyncErpItems;

public sealed record SyncErpItemsCommand(
    Guid IntegrationId,
    string? CategoryFilter,
    string? WarehouseFilter) : IRequest<Result<SyncErpItemsResult>>;
