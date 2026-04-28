using CargoPilot.Application.Common.Models;
using CargoPilot.Domain.Entities;

namespace CargoPilot.Application.Common.Interfaces;

public interface IItemRepository
{
    Task<Item?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default);
    Task<bool> ExistsBySkuAsync(string sku, CancellationToken cancellationToken = default);
<<<<<<< HEAD
    Task<bool> ExistsBySkuAsync(string sku, Guid excludeItemId, CancellationToken cancellationToken = default);
    Task<Item?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default);
=======
    Task<bool> IsUsedInActiveLoadingPlanAsync(Guid itemId, CancellationToken cancellationToken = default);
    Task<PagedResult<Item>> SearchAsync(string? searchTerm, int page, int pageSize, CancellationToken cancellationToken = default);
>>>>>>> 99ec28b2d9685439061df885d57ddd1280c76cbb
    void Add(Item item);
    void Update(Item item);
    Task SaveChangesAsync(CancellationToken cancellationToken = default);
}
