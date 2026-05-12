using CargoPilot.Domain.Enums;

namespace CargoPilot.Application.Features.Integrations.GetSyncSettings;

public record SyncSettingsResponse(
    Guid IntegrationId,
    SyncFrequency? SyncFrequency,
    DateTime? LastSyncAt,
    DateTime? NextScheduledSyncAt,
    ErpSyncStatus SyncStatus
);
