using CargoPilot.Domain.Entities;

namespace CargoPilot.Application.Common.Interfaces;

public interface IItemRepository
{
    Task<bool> ExistsBySkuAsync(string sku, CancellationToken cancellationToken = default);
    Task<bool> ExistsBySkuExcludingAsync(string sku, Guid excludedId, CancellationToken cancellationToken = default);
    Task<Item?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default);
    void Add(Item item);
    Task SaveChangesAsync(CancellationToken cancellationToken = default);
}
