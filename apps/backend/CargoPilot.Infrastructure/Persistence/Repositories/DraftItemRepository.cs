using CargoPilot.Application.Common.Interfaces;
using CargoPilot.Domain.Entities;
using CargoPilot.Domain.Enums;
using Microsoft.EntityFrameworkCore;

namespace CargoPilot.Infrastructure.Persistence.Repositories;

internal sealed class DraftItemRepository : IDraftItemRepository
{
    private readonly AppDbContext _context;

    public DraftItemRepository(AppDbContext context)
    {
        _context = context;
    }

    public async Task<DraftItem?> GetByIdAsync(Guid id, Guid companyId, CancellationToken cancellationToken = default) =>
        await _context.DraftItems
            .FirstOrDefaultAsync(x => x.Id == id && x.CompanyId == companyId, cancellationToken);

    public async Task<DraftItem?> GetByErpIdAsync(string erpId, Guid integrationId, Guid companyId, CancellationToken cancellationToken = default) =>
        await _context.DraftItems
            .FirstOrDefaultAsync(x => x.ErpId == erpId && x.IntegrationId == integrationId && x.CompanyId == companyId, cancellationToken);

    public async Task<(IReadOnlyList<DraftItem> Items, int TotalCount)> ListByCompanyAsync(
        Guid companyId,
        DraftItemStatus? status,
        int page,
        int pageSize,
        CancellationToken cancellationToken = default)
    {
        var query = _context.DraftItems
            .Where(x => x.CompanyId == companyId);

        if (status.HasValue)
            query = query.Where(x => x.Status == status.Value);

        var totalCount = await query.CountAsync(cancellationToken);

        var items = await query
            .OrderByDescending(x => x.CreatedAtUtc)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync(cancellationToken);

        return (items, totalCount);
    }

    public async Task<IReadOnlyList<DraftItem>> GetByIdsAsync(
        IEnumerable<Guid> ids,
        Guid companyId,
        CancellationToken cancellationToken = default) =>
        await _context.DraftItems
            .Where(x => ids.Contains(x.Id) && x.CompanyId == companyId)
            .ToListAsync(cancellationToken);

    public void Add(DraftItem draftItem) => _context.DraftItems.Add(draftItem);

    public void Update(DraftItem draftItem) => _context.DraftItems.Update(draftItem);

    public Task SaveChangesAsync(CancellationToken cancellationToken = default) =>
        _context.SaveChangesAsync(cancellationToken);
}
