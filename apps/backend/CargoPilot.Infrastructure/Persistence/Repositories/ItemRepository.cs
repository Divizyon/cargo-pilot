using CargoPilot.Application.Common.Interfaces;
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

    public Task<bool> ExistsBySkuAsync(string sku, CancellationToken cancellationToken = default) =>
        _dbContext.Items.AnyAsync(i => i.SKU == sku, cancellationToken);

    public Task<bool> ExistsBySkuExcludingAsync(string sku, Guid excludedId, CancellationToken cancellationToken = default) =>
        _dbContext.Items.AnyAsync(i => i.SKU == sku && i.Id != excludedId, cancellationToken);

    public Task<Item?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default) =>
        _dbContext.Items.FirstOrDefaultAsync(i => i.Id == id, cancellationToken);

    public void Add(Item item) =>
        _dbContext.Items.Add(item);

    public Task SaveChangesAsync(CancellationToken cancellationToken = default) =>
        _dbContext.SaveChangesAsync(cancellationToken);
}
