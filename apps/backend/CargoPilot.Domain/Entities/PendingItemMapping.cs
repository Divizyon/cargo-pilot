using CargoPilot.Domain.Enums;

namespace CargoPilot.Domain.Entities;

public sealed class PendingItemMapping : BaseEntity {
    public Guid IntegrationId { get; private set; }
    public string ErpId { get; private set; } = null!;
    public string ErpSku { get; private set; } = null!;
    public string ErpProductName { get; private set; } = null!;
    public string ErpRawDataJson { get; private set; } = null!;
    public Guid? CargoPilotItemId { get; private set; }
    public PendingItemMappingStatus Status { get; private set; }

#pragma warning disable S1144
    public Integration? Integration { get; private set; }
    public Item? CargoPilotItem { get; private set; }
#pragma warning restore S1144

    private PendingItemMapping() { }

    public PendingItemMapping(
        Guid id,
        Guid integrationId,
        string erpId,
        string erpSku,
        string erpProductName,
        string erpRawDataJson) : base(id) {
        IntegrationId = integrationId;
        ErpId = erpId;
        ErpSku = erpSku;
        ErpProductName = erpProductName;
        ErpRawDataJson = erpRawDataJson;
        Status = PendingItemMappingStatus.Pending;
    }

    public void Approve(Guid cargoPilotItemId) {
        CargoPilotItemId = cargoPilotItemId;
        Status = PendingItemMappingStatus.Approved;
    }

    public void Dismiss() {
        Status = PendingItemMappingStatus.Dismissed;
    }

    public void UpdateErpData(string erpSku, string erpProductName, string erpRawDataJson) {
        ErpSku = erpSku;
        ErpProductName = erpProductName;
        ErpRawDataJson = erpRawDataJson;
    }
}
