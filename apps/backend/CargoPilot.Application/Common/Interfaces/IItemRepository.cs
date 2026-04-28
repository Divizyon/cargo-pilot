using CargoPilot.Domain.Entities;

namespace CargoPilot.Application.Common.Interfaces;

public interface IItemRepository
{
    Task<Item?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default);
    Task<bool> ExistsBySkuAsync(string sku, CancellationToken cancellationToken = default);
    Task<bool> IsUsedInActiveLoadingPlanAsync(Guid itemId, CancellationToken cancellationToken = default);
    void Add(Item item);
    Task SaveChangesAsync(CancellationToken cancellationToken = default);
}
