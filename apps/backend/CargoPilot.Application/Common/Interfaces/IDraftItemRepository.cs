using CargoPilot.Domain.Entities;
using CargoPilot.Domain.Enums;

namespace CargoPilot.Application.Common.Interfaces;

public interface IDraftItemRepository
{
    Task<DraftItem?> GetByIdAsync(Guid id, Guid companyId, CancellationToken cancellationToken = default);
    Task<DraftItem?> GetByErpIdAsync(string erpId, Guid integrationId, Guid companyId, CancellationToken cancellationToken = default);
    Task<(IReadOnlyList<DraftItem> Items, int TotalCount)> ListByCompanyAsync(Guid companyId, DraftItemStatus? status, int page, int pageSize, CancellationToken cancellationToken = default);
    Task<IReadOnlyList<DraftItem>> GetByIdsAsync(IEnumerable<Guid> ids, Guid companyId, CancellationToken cancellationToken = default);
    void Add(DraftItem draftItem);
    void Update(DraftItem draftItem);
    Task SaveChangesAsync(CancellationToken cancellationToken = default);
}
