using CargoPilot.Application.Common.Interfaces;
using CargoPilot.Domain.Entities;
using CargoPilot.Domain.Enums;
using Microsoft.EntityFrameworkCore;

namespace CargoPilot.Infrastructure.Persistence.Repositories;

internal sealed class IntegrationRepository : IIntegrationRepository
{
    private readonly AppDbContext _dbContext;

    public IntegrationRepository(AppDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    public Task<Integration?> GetByIdAsync(Guid id, Guid? companyId, CancellationToken cancellationToken = default)
        => _dbContext.Integrations
            .FirstOrDefaultAsync(i => i.Id == id && (companyId == null || i.CompanyId == companyId), cancellationToken);

    public Task<bool> HasAnyRunningSyncAsync(Guid? companyId, CancellationToken cancellationToken = default)
        => _dbContext.Integrations
            .AnyAsync(i => (companyId == null || i.CompanyId == companyId) && i.SyncStatus == ErpSyncStatus.Running, cancellationToken);

    public async Task<IReadOnlyList<Integration>> ListByCompanyAsync(Guid? companyId, CancellationToken cancellationToken = default)
        => await _dbContext.Integrations
            .AsNoTracking()
            .Where(i => companyId == null || i.CompanyId == companyId)
            .ToListAsync(cancellationToken);

    public void AddSyncLog(SyncLog syncLog) => _dbContext.SyncLogs.Add(syncLog);

    public Task SaveChangesAsync(CancellationToken cancellationToken = default)
        => _dbContext.SaveChangesAsync(cancellationToken);
}
