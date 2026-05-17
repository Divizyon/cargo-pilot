using CargoPilot.Domain.Enums;

namespace CargoPilot.Application.Features.Integrations.GetSyncLogs;

public sealed record SyncLogDto(
    Guid Id,
    DateTime StartedAt,
    DateTime? CompletedAt,
    SyncLogStatus Status,
    int SyncedRecordCount,
    string? ErrorMessage);
