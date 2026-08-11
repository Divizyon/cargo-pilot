using CargoPilot.Application.Common.Erp;
using CargoPilot.Domain.Enums;

namespace CargoPilot.Application.Features.Integrations.GetSyncLogs;

/// <summary>
/// Sync kaydi ve satir muhasebesi. <c>SourceTotal</c> kaynakta eleme oncesi bulunan,
/// <c>FetchedCount</c> uygulamaya cekilen satir sayisidir; <c>DroppedByReason</c>
/// neden bazli eleme kirilimi, <c>Unaccounted</c> mutabakat farkidir.
/// </summary>
public sealed record SyncLogDto(
    Guid Id,
    DateTime StartedAt,
    DateTime? CompletedAt,
    SyncLogStatus Status,
    int SyncedRecordCount,
    string? ErrorMessage,
    IReadOnlyList<SyncRowError> RowErrors,
    int SourceTotal,
    int FetchedCount,
    IReadOnlyDictionary<string, int> DroppedByReason,
    int Unaccounted);
