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

    public async Task<bool> TryStartSyncAsync(
        Guid integrationId,
        Guid companyId,
        DateTime startedAtUtc,
        DateTime staleThresholdUtc,
        CancellationToken cancellationToken = default)
    {
        // Kosul UPDATE'in WHERE'i icinde kalir; boylece kontrol ile yazma arasinda
        // baska bir istegin kilidi kapabilecegi bir aralik olusmaz.
        var affected = await _dbContext.Integrations
            .Where(i => i.Id == integrationId && i.CompanyId == companyId)
            .Where(i => !_dbContext.Integrations.Any(other =>
                other.CompanyId == companyId
                && other.SyncStatus == ErpSyncStatus.Running
                && other.SyncStartedAtUtc != null
                && other.SyncStartedAtUtc > staleThresholdUtc))
            .ExecuteUpdateAsync(
                setters => setters
                    .SetProperty(i => i.SyncStatus, ErpSyncStatus.Running)
                    .SetProperty(i => i.SyncStartedAtUtc, startedAtUtc),
                cancellationToken);

        return affected > 0;
    }

    // Cagiranlar ilk kaydi "sirketin entegrasyonu" olarak kullaniyor; siralamasiz liste
    // bunu veritabaninin dondurme sirasina birakirdi.
    public async Task<IReadOnlyList<Integration>> ListByCompanyAsync(Guid companyId, CancellationToken cancellationToken = default)
        => await _dbContext.Integrations
            .AsNoTracking()
            .Where(i => i.CompanyId == companyId)
            .OrderBy(i => i.CreatedAtUtc)
            .ToListAsync(cancellationToken);

    public async Task<IReadOnlyList<Integration>> ListTrackedByCompanyAsync(Guid companyId, CancellationToken cancellationToken = default)
        => await _dbContext.Integrations
            .Where(i => i.CompanyId == companyId)
            .OrderBy(i => i.CreatedAtUtc)
            .ToListAsync(cancellationToken);

    public async Task<IReadOnlyList<Integration>> ListDueForScheduledSyncAsync(
        DateTime utcNow, CancellationToken cancellationToken = default)
        => await _dbContext.Integrations
            .Where(ErpSyncPolicy.DueForScheduledSync(utcNow))
            .OrderBy(i => i.NextScheduledSyncAt)
            .ToListAsync(cancellationToken);

    public Task<bool> ExistsByCompanyAsync(Guid companyId, CancellationToken cancellationToken = default)
        => _dbContext.Integrations.AnyAsync(i => i.CompanyId == companyId, cancellationToken);

    public Task<Integration?> GetLatestDeletedByCompanyAsync(
        Guid companyId, CancellationToken cancellationToken = default)
        => _dbContext.Integrations
            .IgnoreQueryFilters()
            .Where(i => i.CompanyId == companyId && i.IsDeleted)
            .OrderByDescending(i => i.CreatedAtUtc)
            .FirstOrDefaultAsync(cancellationToken);

    public async Task<PagedResult<SyncLog>> ListSyncLogsAsync(
        Guid integrationId, int page, int pageSize, CancellationToken cancellationToken = default)
    {
        var query = _dbContext.SyncLogs
            .AsNoTracking()
            .Where(l => l.IntegrationId == integrationId)
            .Where(ErpSyncPolicy.ProductSyncLog)
            .OrderByDescending(l => l.StartedAt);

        var totalCount = await query.CountAsync(cancellationToken);
        var items = await query
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync(cancellationToken);

        return new PagedResult<SyncLog>(items, totalCount, page, pageSize);
    }

    public Task<int> CountFailedSyncLogsAsync(Guid integrationId, CancellationToken cancellationToken = default)
        => _dbContext.SyncLogs
            .AsNoTracking()
            .Where(ErpSyncPolicy.ProductSyncLog)
            .CountAsync(
                l => l.IntegrationId == integrationId
                    && (l.Status == SyncLogStatus.PartialFailure || l.Status == SyncLogStatus.Failed),
                cancellationToken);

    public void Add(Integration integration) => _dbContext.Integrations.Add(integration);

    public void AddSyncLog(SyncLog syncLog) => _dbContext.SyncLogs.Add(syncLog);

    public Task SaveChangesAsync(CancellationToken cancellationToken = default)
        => _dbContext.SaveChangesAsync(cancellationToken);
}
