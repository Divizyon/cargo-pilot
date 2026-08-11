using CargoPilot.Application.Common.Erp;

namespace CargoPilot.Application.Features.Integrations.SyncErpItems;

/// <summary>
/// Sync ozeti. <c>Skipped</c> hata nedeniyle yazilamayan satir sayisidir;
/// <c>ErrorCount</c> bugun ayni degeri tasir, satir hatalari <c>RowErrors</c> icinde doner.
/// </summary>
public sealed record SyncErpItemsResult(
    Guid SyncLogId,
    int Added,
    int Updated,
    int Skipped,
    int ErrorCount,
    IReadOnlyList<SyncRowError> RowErrors);
