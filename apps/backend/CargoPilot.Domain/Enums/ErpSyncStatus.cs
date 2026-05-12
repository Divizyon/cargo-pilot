namespace CargoPilot.Domain.Enums;

/// <summary>ERP entegrasyonunun anlık senkronizasyon durumu.</summary>
public enum ErpSyncStatus {
    /// <summary>Senkronizasyon bekleniyor.</summary>
    Idle,
    /// <summary>Senkronizasyon devam ediyor.</summary>
    Running,
    /// <summary>Son senkronizasyon başarısız oldu.</summary>
    Failed
}
