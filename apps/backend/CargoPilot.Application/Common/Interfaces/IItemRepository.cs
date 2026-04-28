using CargoPilot.Application.Common.Models;
using CargoPilot.Domain.Entities;
using CargoPilot.Domain.Enums;

namespace CargoPilot.Application.Common.Interfaces;

public interface IItemRepository
{
    Task<bool> ExistsBySkuAsync(string sku, CancellationToken cancellationToken = default);
    Task<PagedResult<Item>> SearchAsync(string? searchTerm, ItemCategory? category, int page, int pageSize, CancellationToken cancellationToken = default);
    void Add(Item item);
    Task SaveChangesAsync(CancellationToken cancellationToken = default);
}
