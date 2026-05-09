using CargoPilot.Domain.Enums;

namespace CargoPilot.Domain.Entities;

public sealed class Integration : BaseEntity {
    public Guid CompanyId { get; private set; }
    public string SystemName { get; private set; } = null!;
    public string ApiEndpoint { get; private set; } = null!;
    public string? MappingTable { get; private set; }
    public int? SyncInterval { get; private set; }
    public DateTime? LastSyncDate { get; private set; }
    public SyncFrequency? SyncFrequency { get; private set; }
    public DateTime? NextScheduledSyncAt { get; private set; }
    public ErpSyncStatus SyncStatus { get; private set; } = ErpSyncStatus.Idle;
    public string? AuthCredentials { get; private set; }

#pragma warning disable S1144
    public Company? Company { get; private set; }
#pragma warning restore S1144
    public ICollection<SyncLog> SyncLogs { get; } = [];
    public ICollection<ErpUserMapping> ErpUserMappings { get; } = [];

    private Integration() { }

    public Integration(
        Guid id,
        Guid companyId,
        string systemName,
        string apiEndpoint,
        string? mappingTable,
        int? syncInterval,
        string? authCredentials) : base(id) {
        CompanyId = companyId;
        SystemName = systemName;
        ApiEndpoint = apiEndpoint;
        MappingTable = mappingTable;
        SyncInterval = syncInterval;
        AuthCredentials = authCredentials;
    }

    public void Update(string systemName, string apiEndpoint, string? mappingTable, int? syncInterval) {
        SystemName = systemName;
        ApiEndpoint = apiEndpoint;
        MappingTable = mappingTable;
        SyncInterval = syncInterval;
    }

    public void UpdateAuthCredentials(string? authCredentials) => AuthCredentials = authCredentials;

    public void RecordSync(DateTime syncDate) => LastSyncDate = syncDate;

    public void UpdateSyncSettings(SyncFrequency? frequency, DateTime? nextScheduledSyncAt) {
        SyncFrequency = frequency;
        NextScheduledSyncAt = nextScheduledSyncAt;
    }

    public void StartSync() => SyncStatus = ErpSyncStatus.Running;

    public void CompleteSync(DateTime lastSyncAt, DateTime? nextScheduledSyncAt) {
        LastSyncDate = lastSyncAt;
        NextScheduledSyncAt = nextScheduledSyncAt;
        SyncStatus = ErpSyncStatus.Idle;
    }

    public void FailSync() => SyncStatus = ErpSyncStatus.Failed;
}
