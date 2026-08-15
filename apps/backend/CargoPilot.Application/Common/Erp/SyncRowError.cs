namespace CargoPilot.Application.Common.Erp;

/// <summary>Sync sirasinda tek bir ERP satirinin islenememe nedeni.</summary>
public sealed record SyncRowError(
    string ErpId,
    string? Sku,
    string Reason);
