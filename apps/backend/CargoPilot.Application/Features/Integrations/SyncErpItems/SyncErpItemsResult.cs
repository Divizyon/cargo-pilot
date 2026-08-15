using CargoPilot.Application.Common.Erp;

namespace CargoPilot.Application.Features.Integrations.SyncErpItems;

/// <summary>
/// Sync ozeti. <c>Skipped</c> hata nedeniyle yazilamayan satir sayisidir;
/// <c>ErrorCount</c> bugun ayni degeri tasir, satir hatalari <c>RowErrors</c> icinde doner.
/// <c>MissingFieldCount</c> eksik alan isaretiyle taslaga yazilan satir sayisidir.
/// <c>Unchanged</c>, ERP verisi bir onceki sync'ten beri degismedigi icin taslaga hic
/// dokunulmayan satir sayisidir; bu satirlar "guncellendi" isaretlenmez.
/// <c>SourceTotal</c> ERP kaynaginda eleme oncesi bulunan satir sayisi,
/// <c>DroppedByReason</c> neden bazli eleme kirilimi (ErpDropReason adi -> adet),
/// <c>Unaccounted</c> ise mutabakat farkidir.
/// </summary>
public sealed record SyncErpItemsResult(
    Guid SyncLogId,
    int Added,
    int Updated,
    int Unchanged,
    int Skipped,
    int ErrorCount,
    int MissingFieldCount,
    IReadOnlyList<SyncRowError> RowErrors,
    int SourceTotal,
    IReadOnlyDictionary<string, int> DroppedByReason,
    int Unaccounted);
