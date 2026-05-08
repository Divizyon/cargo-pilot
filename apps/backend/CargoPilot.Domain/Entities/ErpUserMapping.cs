using CargoPilot.Domain.Enums;

namespace CargoPilot.Domain.Entities;

public sealed class ErpUserMapping : BaseEntity {
    public Guid IntegrationId { get; private set; }
    public Guid CargoPilotUserId { get; private set; }
    public string ErpUserId { get; private set; } = null!;
    public string? ErpUserEmail { get; private set; }
    public ErpMappingStatus Status { get; private set; }
    public DateTime? InvalidatedAt { get; private set; }
    public string? InvalidationReason { get; private set; }

#pragma warning disable S1144
    public Integration? Integration { get; private set; }
    public AppUser? CargoPilotUser { get; private set; }
#pragma warning restore S1144

    private ErpUserMapping() { }

    public ErpUserMapping(
        Guid id,
        Guid integrationId,
        Guid cargoPilotUserId,
        string erpUserId,
        string? erpUserEmail = null) : base(id) {
        IntegrationId = integrationId;
        CargoPilotUserId = cargoPilotUserId;
        ErpUserId = erpUserId;
        ErpUserEmail = erpUserEmail;
        Status = ErpMappingStatus.Active;
    }

    public void Invalidate(string reason) {
        Status = ErpMappingStatus.Invalid;
        InvalidatedAt = DateTime.UtcNow;
        InvalidationReason = reason;
    }

    public void Reactivate(string erpUserId, string? erpUserEmail) {
        ErpUserId = erpUserId;
        ErpUserEmail = erpUserEmail;
        Status = ErpMappingStatus.Active;
        InvalidatedAt = null;
        InvalidationReason = null;
    }
}
