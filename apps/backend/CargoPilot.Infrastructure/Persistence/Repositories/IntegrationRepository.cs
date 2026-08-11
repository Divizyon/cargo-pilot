using CargoPilot.Application.Common.Erp;
using CargoPilot.Application.Common.Interfaces;
using CargoPilot.Application.Common.Models;
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
            .FirstOrDefaultAsync(i => i.Id == id && i.CompanyId == companyId, cancellationToken);

    public Task<bool> HasAnyRunningSyncAsync(
        Guid companyId, DateTime staleThresholdUtc, CancellationToken cancellationToken = default)
        => _dbContext.Integrations
            .AnyAsync(
                i => i.CompanyId == companyId
                    && i.SyncStatus == ErpSyncStatus.Running
                    && i.SyncStartedAtUtc != null
                    && i.SyncStartedAtUtc > staleThresholdUtc,
                cancellationToken);

    public async Task<IReadOnlyList<Integration>> ListByCompanyAsync(Guid companyId, CancellationToken cancellationToken = default)
        => await _dbContext.Integrations
            .AsNoTracking()
            .Where(i => i.CompanyId == companyId)
            .ToListAsync(cancellationToken);

    public async Task<IReadOnlyList<Integration>> ListDueForScheduledSyncAsync(
        DateTime utcNow, CancellationToken cancellationToken = default)
        => await _dbContext.Integrations
            .Where(ErpSyncPolicy.DueForScheduledSync(utcNow))
            .OrderBy(i => i.NextScheduledSyncAt)
            .ToListAsync(cancellationToken);

    public Task<bool> ExistsByCompanyAsync(Guid companyId, CancellationToken cancellationToken = default)
        => _dbContext.Integrations.AnyAsync(i => i.CompanyId == companyId, cancellationToken);

    public async Task<PagedResult<SyncLog>> ListSyncLogsAsync(
        Guid integrationId, int page, int pageSize, CancellationToken cancellationToken = default)
    {
        var query = _dbContext.SyncLogs
            .AsNoTracking()
            .Where(l => l.IntegrationId == integrationId)
            .OrderByDescending(l => l.StartedAt);

        var totalCount = await query.CountAsync(cancellationToken);
        var items = await query
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync(cancellationToken);

        return new PagedResult<SyncLog>(items, totalCount, page, pageSize);
    }

    public void Add(Integration integration) => _dbContext.Integrations.Add(integration);

    public void AddSyncLog(SyncLog syncLog) => _dbContext.SyncLogs.Add(syncLog);

    public Task SaveChangesAsync(CancellationToken cancellationToken = default)
        => _dbContext.SaveChangesAsync(cancellationToken);
}
