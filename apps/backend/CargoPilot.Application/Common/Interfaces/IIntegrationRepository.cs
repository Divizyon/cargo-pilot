using CargoPilot.Application.Common.Models;
using CargoPilot.Domain.Entities;

namespace CargoPilot.Application.Common.Interfaces;

public interface IIntegrationRepository
{
    Task<Integration?> GetByIdAsync(Guid id, Guid? companyId, CancellationToken cancellationToken = default);
    /// <summary>
    /// Sirket icin halen calisan bir sync var mi. <paramref name="staleThresholdUtc"/> oncesinde
    /// baslamis Running kayitlari takilmis sayilir ve kilit olarak degerlendirilmez.
    /// </summary>
    Task<bool> HasAnyRunningSyncAsync(Guid companyId, DateTime staleThresholdUtc, CancellationToken cancellationToken = default);
    /// <summary>
    /// Sync kilidini tek ifadede alir: hedef entegrasyonu yalnizca sirkette taze bir Running
    /// kayit yokken Running'e cevirir ve kilidi alip almadigini doner. Once okuyup sonra yazan
    /// iki adimda es zamanli iki istek de bosluktan gecebiliyordu; tek UPDATE'te yalnizca biri
    /// satiri degistirir.
    /// </summary>
    Task<bool> TryStartSyncAsync(Guid integrationId, Guid companyId, DateTime startedAtUtc, DateTime staleThresholdUtc, CancellationToken cancellationToken = default);
    /// <summary>
    /// Zamanlanmis sync vadesi gelmis (frekansi olan ve planlanan ani gecmis) tum sirketlerin
    /// entegrasyonlari. Arka plan zamanlayicisi kullanir; kayitlar izlenir ki vade guncellenebilsin.
    /// </summary>
    Task<IReadOnlyList<Integration>> ListDueForScheduledSyncAsync(DateTime utcNow, CancellationToken cancellationToken = default);
    Task<bool> ExistsByCompanyAsync(Guid companyId, CancellationToken cancellationToken = default);
    Task<IReadOnlyList<Integration>> ListByCompanyAsync(Guid companyId, CancellationToken cancellationToken = default);
    /// <summary>Degistirilecek kayitlar icin izlenen (tracked) liste; kaydetmede kalicilasir.</summary>
    Task<IReadOnlyList<Integration>> ListTrackedByCompanyAsync(Guid companyId, CancellationToken cancellationToken = default);
    Task<PagedResult<SyncLog>> ListSyncLogsAsync(Guid integrationId, int page, int pageSize, CancellationToken cancellationToken = default);
    /// <summary>
    /// Entegrasyonun tamamindaki basarisiz ve kismi basarisiz sync kayit sayisi; sayfa
    /// sinirindan bagimsizdir.
    /// </summary>
    Task<int> CountFailedSyncLogsAsync(Guid integrationId, CancellationToken cancellationToken = default);
    void Add(Integration integration);
    void AddSyncLog(SyncLog syncLog);
    Task SaveChangesAsync(CancellationToken cancellationToken = default);
}
