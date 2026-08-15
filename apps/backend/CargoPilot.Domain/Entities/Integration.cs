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

    /// <summary>Calisan sync'in baslangic ani; Running'de takilan kayitlarin zaman asimi icin kullanilir.</summary>
    public DateTime? SyncStartedAtUtc { get; private set; }

#pragma warning disable S1144
    public Company? Company { get; private set; }
#pragma warning restore S1144
    public ICollection<SyncLog> SyncLogs { get; } = [];

    private Integration() { }

    public Integration(
        Guid id,
        Guid companyId,
        string systemName,
        string apiEndpoint,
        string? mappingTable,
        int? syncInterval) : base(id) {
        CompanyId = companyId;
        SystemName = systemName;
        ApiEndpoint = apiEndpoint;
        MappingTable = mappingTable;
        SyncInterval = syncInterval;
    }

    public void Update(string systemName, string apiEndpoint, string? mappingTable, int? syncInterval) {
        SystemName = systemName;
        ApiEndpoint = apiEndpoint;
        MappingTable = mappingTable;
        SyncInterval = syncInterval;
    }

    /// <summary>
    /// Kaldirilmis baglanti yeniden kurulurken ayni kayit canlandirilir. Yerine yeni kayit
    /// acilsaydi eski taslaklar olu bir entegrasyonda kalir ve ayni urun her baglanista
    /// listede bir kez daha gorunurdu; taslaklarin tekilligi (IntegrationId, ErpId) uzerinde.
    /// Zamanlama sifirlanir: kullanici acisindan bu yeni bir kurulum, eski otomatik
    /// senkronizasyon tercihi habersiz devam etmemeli.
    /// </summary>
    public void Reactivate(string systemName, string apiEndpoint) {
        Restore();
        Update(systemName, apiEndpoint, MappingTable, SyncInterval);
        SyncFrequency = null;
        NextScheduledSyncAt = null;
        SyncStatus = ErpSyncStatus.Idle;
        SyncStartedAtUtc = null;
    }

    public void RecordSync(DateTime syncDate) => LastSyncDate = syncDate;

    public void UpdateSyncSettings(SyncFrequency? frequency, DateTime? nextScheduledSyncAt) {
        SyncFrequency = frequency;
        NextScheduledSyncAt = nextScheduledSyncAt;
    }

    /// <summary>Frekansi degistirmeden yalnizca bir sonraki vadeyi ileri alir.</summary>
    public void RescheduleNextSync(DateTime? nextScheduledSyncAt) => NextScheduledSyncAt = nextScheduledSyncAt;

    public void StartSync(DateTime startedAtUtc) {
        SyncStatus = ErpSyncStatus.Running;
        SyncStartedAtUtc = startedAtUtc;
    }

    public void CompleteSync(DateTime lastSyncAt, DateTime? nextScheduledSyncAt) {
        LastSyncDate = lastSyncAt;
        NextScheduledSyncAt = nextScheduledSyncAt;
        SyncStatus = ErpSyncStatus.Idle;
        SyncStartedAtUtc = null;
    }

    public void FailSync() {
        SyncStatus = ErpSyncStatus.Failed;
        SyncStartedAtUtc = null;
    }
}
