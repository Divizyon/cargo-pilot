using CargoPilot.Domain.Enums;

namespace CargoPilot.Domain.Entities;

public sealed class SyncLog : BaseEntity {
    public Guid IntegrationId { get; private set; }
    public Guid? LoadingPlanId { get; private set; }
    public DateTime StartedAt { get; private set; }
    public DateTime? CompletedAt { get; private set; }
    public SyncLogStatus Status { get; private set; }
    public int SyncedRecordCount { get; private set; }
    public int RuleAssignedCount { get; private set; }
    public int RuleNotAssignedCount { get; private set; }
    public string? ErrorMessage { get; private set; }

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

    public void Complete(int syncedRecordCount, int ruleAssignedCount = 0, int ruleNotAssignedCount = 0) {
        CompletedAt = DateTime.UtcNow;
        Status = SyncLogStatus.Success;
        SyncedRecordCount = syncedRecordCount;
        RuleAssignedCount = ruleAssignedCount;
        RuleNotAssignedCount = ruleNotAssignedCount;
    }

    public void Fail(string errorMessage) {
        CompletedAt = DateTime.UtcNow;
        Status = SyncLogStatus.Failed;
        ErrorMessage = errorMessage;
    }

    public void PartialFail(int syncedRecordCount, string errorMessage, int ruleAssignedCount = 0, int ruleNotAssignedCount = 0) {
        CompletedAt = DateTime.UtcNow;
        Status = SyncLogStatus.PartialFailure;
        SyncedRecordCount = syncedRecordCount;
        ErrorMessage = errorMessage;
        RuleAssignedCount = ruleAssignedCount;
        RuleNotAssignedCount = ruleNotAssignedCount;
    }
}
