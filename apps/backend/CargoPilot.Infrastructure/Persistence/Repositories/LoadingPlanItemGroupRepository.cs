using CargoPilot.Application.Common.Interfaces;
using CargoPilot.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace CargoPilot.Infrastructure.Persistence.Repositories;

internal sealed class LoadingPlanItemGroupRepository : ILoadingPlanItemGroupRepository
{
    private readonly AppDbContext _context;

    public LoadingPlanItemGroupRepository(AppDbContext context)
    {
        _context = context;
    }

    public async Task<LoadingPlanItemGroup?> GetByIdAsync(Guid id, Guid planId, CancellationToken cancellationToken = default)
        => await _context.LoadingPlanItemGroups
            .FirstOrDefaultAsync(g => g.Id == id && g.LoadingPlanId == planId, cancellationToken);

    public async Task<IReadOnlyList<LoadingPlanItemGroup>> GetByPlanIdAsync(Guid planId, CancellationToken cancellationToken = default)
        => await _context.LoadingPlanItemGroups
            .AsNoTracking()
            .Where(g => g.LoadingPlanId == planId)
            .ToListAsync(cancellationToken);

    public async Task<IReadOnlyList<LoadingPlanItemGroup>> GetByIdsAsync(IReadOnlyList<Guid> ids, Guid? companyId, CancellationToken cancellationToken = default)
        => await _context.LoadingPlanItemGroups
            .AsNoTracking()
            .Where(g => ids.Contains(g.Id) && g.LoadingPlan.CompanyId == companyId)
            .ToListAsync(cancellationToken);

    public void Add(LoadingPlanItemGroup group)
        => _context.LoadingPlanItemGroups.Add(group);

    public async Task NullifyGroupOnItemsAsync(Guid groupId, CancellationToken cancellationToken = default)
        => await _context.LoadingPlanInputItems
            .Where(i => i.GroupId == groupId)
            .ExecuteUpdateAsync(s => s.SetProperty(i => i.GroupId, (Guid?)null), cancellationToken);

    public async Task DeleteItemsByGroupAsync(Guid groupId, CancellationToken cancellationToken = default)
    {
        var now = DateTime.UtcNow;
        await _context.LoadingPlanInputItems
            .Where(i => i.GroupId == groupId)
            .ExecuteUpdateAsync(s => s
                .SetProperty(i => i.IsDeleted, true)
                .SetProperty(i => i.DeletedAtUtc, now)
                .SetProperty(i => i.IsActive, false), cancellationToken);
    }

    public Task SaveChangesAsync(CancellationToken cancellationToken = default)
        => _context.SaveChangesAsync(cancellationToken);
}
