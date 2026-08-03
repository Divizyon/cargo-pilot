namespace CargoPilot.Application.Features.Integrations.SyncErpItems;

public sealed record SyncErpItemsResult(
    Guid SyncLogId,
    int Added,
    int Updated,
    int Skipped);
