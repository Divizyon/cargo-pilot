namespace CargoPilot.Domain.Enums;

/// <summary>LoadingPlan'ın ERP'ye aktarım durumu.</summary>
public enum ErpExportStatus {
    /// <summary>Aktarım kuyruğa alındı.</summary>
    Pending,
    /// <summary>Aktarım başarıyla tamamlandı.</summary>
    Sent,
    /// <summary>Aktarım başarısız oldu.</summary>
    Failed
}
