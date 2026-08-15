using CargoPilot.Domain.Enums;

namespace CargoPilot.Domain.Entities;

public sealed class SyncLog : BaseEntity {
    public Guid IntegrationId { get; private set; }
    public Guid? LoadingPlanId { get; private set; }
    public DateTime StartedAt { get; private set; }
    public DateTime? CompletedAt { get; private set; }
    public SyncLogStatus Status { get; private set; }
    public int SyncedRecordCount { get; private set; }
    public string? ErrorMessage { get; private set; }

    /// <summary>Satir bazli hatalarin JSON listesi; kismi basari durumunda doldurulur.</summary>
    public string? RowErrorsJson { get; private set; }

    /// <summary>ERP kaynaginda eleme oncesi bulunan satir sayisi.</summary>
    public int SourceTotal { get; private set; }

    /// <summary>Kaynaktan uygulamaya cekilen (islenmeye aday) satir sayisi.</summary>
    public int FetchedCount { get; private set; }

    /// <summary>Neden bazli eleme sayilarinin JSON sozlugu (ErpDropReason adi -> adet).</summary>
    public string? DroppedByReasonJson { get; private set; }

    /// <summary>ERP verisi degismedigi icin taslaga hic dokunulmayan satir sayisi.</summary>
    public int UnchangedCount { get; private set; }

    /// <summary>Mutabakat farki: SourceTotal - (yazilan + degismeyen + atlanan + elenen).</summary>
    public int UnaccountedCount { get; private set; }

#pragma warning disable S1144
    public Integration? Integration { get; private set; }
#pragma warning restore S1144

    private SyncLog() { }

    public SyncLog(Guid id, Guid integrationId) : base(id) {
        IntegrationId = integrationId;
        StartedAt = DateTime.UtcNow;
        Status = SyncLogStatus.Running;
    }

    public SyncLog(Guid id, Guid integrationId, Guid loadingPlanId) : this(id, integrationId) {
        LoadingPlanId = loadingPlanId;
    }

    public void Complete(int syncedRecordCount, SyncAccounting? accounting = null) {
        CompletedAt = DateTime.UtcNow;
        Status = SyncLogStatus.Success;
        SyncedRecordCount = syncedRecordCount;
        ApplyAccounting(accounting);
    }

    public void Fail(string errorMessage) {
        CompletedAt = DateTime.UtcNow;
        Status = SyncLogStatus.Failed;
        ErrorMessage = errorMessage;
    }

    public void PartialFail(
        int syncedRecordCount,
        string errorMessage,
        string? rowErrorsJson = null,
        SyncAccounting? accounting = null) {
        CompletedAt = DateTime.UtcNow;
        Status = SyncLogStatus.PartialFailure;
        SyncedRecordCount = syncedRecordCount;
        ErrorMessage = errorMessage;
        RowErrorsJson = rowErrorsJson;
        ApplyAccounting(accounting);
    }

    private void ApplyAccounting(SyncAccounting? accounting) {
        if (accounting is null)
            return;

        SourceTotal = accounting.SourceTotal;
        FetchedCount = accounting.FetchedCount;
        DroppedByReasonJson = accounting.DroppedByReasonJson;
        UnchangedCount = accounting.Unchanged;
        UnaccountedCount = accounting.Unaccounted;
    }
}
