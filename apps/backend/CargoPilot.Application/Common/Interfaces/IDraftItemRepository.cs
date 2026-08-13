using CargoPilot.Application.Common.Erp;
using CargoPilot.Domain.Entities;
using CargoPilot.Domain.Enums;

namespace CargoPilot.Application.Common.Interfaces;

public interface IDraftItemRepository
{
    Task<DraftItem?> GetByIdAsync(Guid id, Guid companyId, CancellationToken cancellationToken = default);
    Task<DraftItem?> GetByErpIdAsync(string erpId, Guid integrationId, Guid companyId, CancellationToken cancellationToken = default);
    Task<(IReadOnlyList<DraftItem> Items, int TotalCount)> ListByCompanyAsync(Guid companyId, IReadOnlyList<DraftItemStatus>? statuses, int page, int pageSize, CancellationToken cancellationToken = default);
    Task<IReadOnlyList<DraftItem>> GetByIdsAsync(IEnumerable<Guid> ids, Guid companyId, CancellationToken cancellationToken = default);
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
