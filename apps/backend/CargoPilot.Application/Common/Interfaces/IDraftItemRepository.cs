using CargoPilot.Application.Common.Erp;
using CargoPilot.Domain.Entities;
using CargoPilot.Domain.Enums;

namespace CargoPilot.Application.Common.Interfaces;

public interface IDraftItemRepository
{
    Task<DraftItem?> GetByIdAsync(Guid id, Guid companyId, CancellationToken cancellationToken = default);
    Task<DraftItem?> GetByErpIdAsync(string erpId, Guid integrationId, Guid companyId, CancellationToken cancellationToken = default);
    /// <summary>
    /// Durum, serbest metin aramasi ve kategori filtresi veritabaninda uygulanir.
    /// <c>AvailableCategories</c> kategori filtresinden once hesaplanir; filtre secenekleri
    /// kendi filtresiyle daralmaz.
    /// </summary>
    Task<(IReadOnlyList<DraftItem> Items, int TotalCount, IReadOnlyList<ItemCategory> AvailableCategories)> ListByCompanyAsync(
        Guid companyId,
        IReadOnlyList<DraftItemStatus>? statuses,
        string? search,
        IReadOnlyList<ItemCategory>? categories,
        int page,
        int pageSize,
        CancellationToken cancellationToken = default);
    Task<IReadOnlyList<DraftItem>> GetByIdsAsync(IEnumerable<Guid> ids, Guid companyId, CancellationToken cancellationToken = default);
    /// <summary>
    /// Sirketin tum taslaklari, izlenen halde. ERP birim ayari degistiginde olculer
    /// topluca yeniden yorumlanir; kaydetmede kalicilasir.
    /// </summary>
    Task<IReadOnlyList<DraftItem>> ListTrackedByCompanyAsync(Guid companyId, CancellationToken cancellationToken = default);
    void Add(DraftItem draftItem);
    void Update(DraftItem draftItem);

    /// <summary>
    /// Islenemeyen taslagi degisiklik izleyicisinden cikarir; yarim kalan bir degisiklik
    /// partinin geri kalaniyla birlikte kaydedilmez.
    /// </summary>
    void Discard(DraftItem draftItem);

    Task SaveChangesAsync(CancellationToken cancellationToken = default);

    /// <summary>
    /// Kaydeder; veritabani tek bir taslak yuzunden partiyi reddederse o taslagi izlemeden
    /// cikarip kalanlari yeniden dener. Donen liste kaydedilemeyen satirlardir. Hatanin
    /// kaynagi taslak disi bir kayitsa (or. <see cref="SyncLog"/>) izole edilemez ve
    /// istisna cagirana yukselir.
    /// </summary>
    Task<IReadOnlyList<DraftSaveFailure>> SaveChangesIsolatingFailuresAsync(CancellationToken cancellationToken = default);
}
