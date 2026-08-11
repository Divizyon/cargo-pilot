using System.Linq.Expressions;
using CargoPilot.Domain.Entities;
using CargoPilot.Domain.Enums;

namespace CargoPilot.Application.Common.Erp;

/// <summary>ERP senkronizasyonunun eszamanlilik kilidi ve zamanlama politikasi.</summary>
public static class ErpSyncPolicy
{
    /// <summary>Bu suredir Running kalan bir sync takilmis sayilir ve yeni sync'i engellemez.</summary>
    public static readonly TimeSpan RunningTimeout = TimeSpan.FromMinutes(30);

    /// <summary>Bu andan once baslamis Running kayitlari zaman asimina ugramis kabul edilir.</summary>
    public static DateTime StaleThreshold(DateTime utcNow) => utcNow - RunningTimeout;

    /// <summary>
    /// Bir sonraki zamanlanmis sync ani. Frekans secilmemisse otomatik sync yoktur ve null doner.
    /// Vade her sync denemesinden sonra yeniden hesaplanir; boylece takvim son calisma anina gore ilerler.
    /// </summary>
    public static DateTime? NextScheduledSyncAt(SyncFrequency? frequency, DateTime fromUtc) =>
        frequency.HasValue ? fromUtc.Add(frequency.Value.ToTimeSpan()) : null;

    /// <summary>
    /// Vadesi gelmis entegrasyon filtresi: frekans secilmis ve planlanan an gecmis.
    /// Ayni ifade hem EF sorgusunda hem birim testinde kullanilir.
    /// </summary>
    /// <summary>
    /// Urun senkronizasyon gecmisi filtresi: plan->ERP aktarim kayitlari (LoadingPlanId dolu)
    /// urun cekim gecmisine karismaz, cunku o tablonun sayaclari (kaynak satir, eleme nedeni)
    /// aktarim icin anlamsizdir. Aktarim sonucu plan detayinda gorunur.
    /// </summary>
    public static readonly Expression<Func<SyncLog, bool>> ProductSyncLog =
        log => log.LoadingPlanId == null;

    public static Expression<Func<Integration, bool>> DueForScheduledSync(DateTime utcNow) =>
        integration => integration.SyncFrequency != null
            && integration.NextScheduledSyncAt != null
            && integration.NextScheduledSyncAt <= utcNow;
}
