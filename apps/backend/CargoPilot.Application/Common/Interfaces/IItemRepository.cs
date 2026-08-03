using CargoPilot.Application.Common.Models;
using CargoPilot.Domain.Entities;

namespace CargoPilot.Application.Common.Interfaces;

public interface IItemRepository
{
    Task<Item?> GetByIdAsync(Guid id, Guid? companyId, CancellationToken cancellationToken = default);
    Task<IReadOnlyList<Guid>> GetExistingIdsAsync(IEnumerable<Guid> ids, Guid? companyId, CancellationToken cancellationToken = default);
    Task<IReadOnlyList<Item>> GetByIdsAsync(IEnumerable<Guid> ids, Guid? companyId, CancellationToken cancellationToken = default);
    Task<Item?> GetByErpIdAsync(string erpId, Guid integrationId, Guid companyId, CancellationToken cancellationToken = default);
    Task<Item?> GetBySkuAsync(string sku, Guid? companyId, CancellationToken cancellationToken = default);
    Task<IReadOnlyList<Item>> GetBySkusAsync(IEnumerable<string> skus, Guid? companyId, CancellationToken cancellationToken = default);
    Task<bool> ExistsBySkuAsync(string sku, Guid? companyId, CancellationToken cancellationToken = default);
    Task<bool> ExistsBySkuAsync(string sku, Guid excludeItemId, Guid? companyId, CancellationToken cancellationToken = default);
    Task<bool> IsUsedInActiveLoadingPlanAsync(Guid itemId, CancellationToken cancellationToken = default);
    Task<PagedResult<Item>> SearchAsync(string? searchTerm, int page, int pageSize, Guid? companyId, CancellationToken cancellationToken = default);
    Task<int> CountByUserAsync(Guid userId, CancellationToken cancellationToken = default);
    Task<int> CountByCompanyAsync(Guid companyId, CancellationToken cancellationToken = default);
    void Add(Item item);
    void Update(Item item);
    Task SaveChangesAsync(CancellationToken cancellationToken = default);
}