namespace CargoPilot.Application.Common.Erp;

/// <summary>ERP senkronizasyonunun eszamanlilik kilidi politikasi.</summary>
public static class ErpSyncPolicy
{
    /// <summary>Bu suredir Running kalan bir sync takilmis sayilir ve yeni sync'i engellemez.</summary>
    public static readonly TimeSpan RunningTimeout = TimeSpan.FromMinutes(30);

    /// <summary>Bu andan once baslamis Running kayitlari zaman asimina ugramis kabul edilir.</summary>
    public static DateTime StaleThreshold(DateTime utcNow) => utcNow - RunningTimeout;
}
