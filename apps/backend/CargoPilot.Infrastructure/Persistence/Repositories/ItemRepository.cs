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

    public Task<Item?> GetByIdAsync(Guid id, Guid? companyId, CancellationToken cancellationToken = default)
    {
        return _dbContext.Items
            .FirstOrDefaultAsync(i => i.Id == id && i.CompanyId == companyId, cancellationToken);
    }

    public async Task<IReadOnlyList<Guid>> GetExistingIdsAsync(
        IEnumerable<Guid> ids,
        Guid? companyId,
        CancellationToken cancellationToken = default)
    {
        var idList = ids.ToList();
        return await _dbContext.Items
            .AsNoTracking()
            .Where(i => idList.Contains(i.Id) && i.CompanyId == companyId)
            .Select(i => i.Id)
            .ToListAsync(cancellationToken);
    }

    public async Task<IReadOnlyList<Item>> GetByIdsAsync(
        IEnumerable<Guid> ids,
        Guid? companyId,
        CancellationToken cancellationToken = default)
    {
        var idList = ids.ToList();
        return await _dbContext.Items
            .AsNoTracking()
            .Where(i => idList.Contains(i.Id) && i.CompanyId == companyId)
            .ToListAsync(cancellationToken);
    }

    public Task<Item?> GetByErpIdAsync(string erpId, Guid integrationId, Guid companyId, CancellationToken cancellationToken = default)
    {
        return _dbContext.Items
            .FirstOrDefaultAsync(i => i.ErpId == erpId && i.IntegrationId == integrationId && i.CompanyId == companyId, cancellationToken);
    }

    public Task<Item?> GetBySkuAsync(string sku, Guid? companyId, CancellationToken cancellationToken = default)
    {
        return _dbContext.Items
            .FirstOrDefaultAsync(i => i.SKU == sku && i.CompanyId == companyId, cancellationToken);
    }

    public async Task<IReadOnlyList<Item>> GetBySkusAsync(
        IEnumerable<string> skus,
        Guid? companyId,
        CancellationToken cancellationToken = default)
    {
        var skuList = skus.ToList();
        return await _dbContext.Items
            .Where(i => skuList.Contains(i.SKU) && i.CompanyId == companyId)
            .ToListAsync(cancellationToken);
    }

    public Task<bool> ExistsBySkuAsync(string sku, Guid? companyId, CancellationToken cancellationToken = default)
    {
        return _dbContext.Items
            .AnyAsync(i => i.SKU == sku && i.CompanyId == companyId, cancellationToken);
    }

    public Task<bool> ExistsBySkuAsync(string sku, Guid excludeItemId, Guid? companyId, CancellationToken cancellationToken = default)
    {
        return _dbContext.Items
            .AnyAsync(i => i.SKU == sku && i.Id != excludeItemId && i.CompanyId == companyId, cancellationToken);
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
        Guid? companyId,
        CancellationToken cancellationToken = default)
    {
        var query = _dbContext.Items.AsNoTracking()
            .Where(i => i.CompanyId == companyId);

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

    public Task<int> CountByUserAsync(Guid userId, CancellationToken cancellationToken = default)
        => _dbContext.Items.CountAsync(i => i.CreatedBy == userId, cancellationToken);

    public Task<int> CountByCompanyAsync(Guid companyId, CancellationToken cancellationToken = default)
        => _dbContext.Items.CountAsync(i => i.CompanyId == companyId, cancellationToken);

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