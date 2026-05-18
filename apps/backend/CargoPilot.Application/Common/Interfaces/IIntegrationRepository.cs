using CargoPilot.Application.Common.Models;
using CargoPilot.Domain.Entities;

namespace CargoPilot.Application.Common.Interfaces;

public interface IIntegrationRepository
{
    Task<Integration?> GetByIdAsync(Guid id, Guid? companyId, CancellationToken cancellationToken = default);
    Task<bool> HasAnyRunningSyncAsync(Guid companyId, CancellationToken cancellationToken = default);
    Task<bool> ExistsByCompanyAsync(Guid companyId, CancellationToken cancellationToken = default);
    Task<IReadOnlyList<Integration>> ListByCompanyAsync(Guid companyId, CancellationToken cancellationToken = default);
    Task<PagedResult<SyncLog>> ListSyncLogsAsync(Guid integrationId, int page, int pageSize, CancellationToken cancellationToken = default);
    void Add(Integration integration);
    void AddSyncLog(SyncLog syncLog);
    Task SaveChangesAsync(CancellationToken cancellationToken = default);
}
