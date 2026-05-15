using CargoPilot.Domain.Entities;

namespace CargoPilot.Application.Common.Interfaces;

public interface IIntegrationRepository
{
    Task<Integration?> GetByIdAsync(Guid id, Guid? companyId, CancellationToken cancellationToken = default);
    Task<bool> HasAnyRunningSyncAsync(Guid? companyId, CancellationToken cancellationToken = default);
    Task<IReadOnlyList<Integration>> ListByCompanyAsync(Guid? companyId, CancellationToken cancellationToken = default);
    void AddSyncLog(SyncLog syncLog);
    Task SaveChangesAsync(CancellationToken cancellationToken = default);
}
