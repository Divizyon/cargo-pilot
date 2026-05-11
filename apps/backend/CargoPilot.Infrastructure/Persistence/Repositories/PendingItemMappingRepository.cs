using CargoPilot.Application.Common.Interfaces;
using CargoPilot.Application.Common.Models;
using CargoPilot.Domain.Entities;
using CargoPilot.Domain.Enums;
using Microsoft.EntityFrameworkCore;

namespace CargoPilot.Infrastructure.Persistence.Repositories;

internal sealed class PendingItemMappingRepository : IPendingItemMappingRepository
{
    private readonly AppDbContext _dbContext;

    public PendingItemMappingRepository(AppDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    public Task<PendingItemMapping?> GetByIdAsync(Guid id, Guid integrationId, CancellationToken cancellationToken = default)
    {
        return _dbContext.PendingItemMappings
            .FirstOrDefaultAsync(m => m.Id == id && m.IntegrationId == integrationId, cancellationToken);
    }

    public Task<PendingItemMapping?> GetByErpIdAsync(Guid integrationId, string erpId, CancellationToken cancellationToken = default)
    {
        return _dbContext.PendingItemMappings
            .FirstOrDefaultAsync(m => m.IntegrationId == integrationId && m.ErpId == erpId, cancellationToken);
    }

    public async Task<IReadOnlyList<PendingItemMapping>> GetApprovedByIntegrationAsync(Guid integrationId, CancellationToken cancellationToken = default)
    {
        return await _dbContext.PendingItemMappings
            .AsNoTracking()
            .Where(m => m.IntegrationId == integrationId && m.Status == PendingItemMappingStatus.Approved)
            .ToListAsync(cancellationToken);
    }

    public async Task<PagedResult<PendingItemMapping>> GetPagedAsync(
        Guid integrationId,
        PendingItemMappingStatus? status,
        int page,
        int pageSize,
        CancellationToken cancellationToken = default)
    {
        var query = _dbContext.PendingItemMappings
            .AsNoTracking()
            .Where(m => m.IntegrationId == integrationId);

        if (status.HasValue)
            query = query.Where(m => m.Status == status.Value);

        var totalCount = await query.CountAsync(cancellationToken);

        var items = await query
            .OrderByDescending(m => m.CreatedAtUtc)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync(cancellationToken);

        return new PagedResult<PendingItemMapping>(items, totalCount, page, pageSize);
    }

    public void Add(PendingItemMapping mapping)
    {
        _dbContext.PendingItemMappings.Add(mapping);
    }

    public void Update(PendingItemMapping mapping)
    {
        _dbContext.PendingItemMappings.Update(mapping);
    }

    public void Remove(PendingItemMapping mapping)
    {
        _dbContext.PendingItemMappings.Remove(mapping);
    }

    public Task SaveChangesAsync(CancellationToken cancellationToken = default)
    {
        return _dbContext.SaveChangesAsync(cancellationToken);
    }
}
