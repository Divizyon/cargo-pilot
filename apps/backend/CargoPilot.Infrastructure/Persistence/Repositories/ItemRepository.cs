using CargoPilot.Application.Common.Interfaces;
using CargoPilot.Application.Common.Models;
using CargoPilot.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace CargoPilot.Infrastructure.Persistence.Repositories;

internal sealed class ItemRepository : IItemRepository
{
    private readonly AppDbContext _dbContext;

    public ItemRepository(AppDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    public Task<Item?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default)
    {
        return _dbContext.Items
            .FirstOrDefaultAsync(i => i.Id == id, cancellationToken);
    }

    public Task<bool> ExistsBySkuAsync(string sku, CancellationToken cancellationToken = default)
    {
        return _dbContext.Items
            .AnyAsync(i => i.SKU == sku, cancellationToken);
    }

    public Task<bool> ExistsBySkuAsync(string sku, Guid excludeItemId, CancellationToken cancellationToken = default)
    {
        return _dbContext.Items
            .AnyAsync(i => i.SKU == sku && i.Id != excludeItemId, cancellationToken);
    }

    public Task<bool> IsUsedInActiveLoadingPlanAsync(Guid itemId, CancellationToken cancellationToken = default)
    {
        // Loading plan entity henüz implement edilmedi; ilerleyen aşamada doldurulacak.
        return Task.FromResult(false);
    }

    public async Task<PagedResult<Item>> SearchAsync(
        string? searchTerm,
        int page,
        int pageSize,
        CancellationToken cancellationToken = default)
    {
        var query = _dbContext.Items.AsNoTracking();

        if (!string.IsNullOrWhiteSpace(searchTerm))
        {
            var term = searchTerm.Trim();
            query = query.Where(i => i.Name.Contains(term) || i.SKU.Contains(term));
        }

        var totalCount = await query.CountAsync(cancellationToken);

        var items = await query
            .OrderBy(i => i.Name)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync(cancellationToken);

        return new PagedResult<Item>(items, totalCount, page, pageSize);
    }

    public void Add(Item item)
    {
        _dbContext.Items.Add(item);
    }

    public void Update(Item item)
    {
        _dbContext.Items.Update(item);
    }

    public Task SaveChangesAsync(CancellationToken cancellationToken = default)
    {
        return _dbContext.SaveChangesAsync(cancellationToken);
    }
}