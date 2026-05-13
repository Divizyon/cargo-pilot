using CargoPilot.Application.Common.Models;
using CargoPilot.Domain.Entities;
using CargoPilot.Domain.Enums;

namespace CargoPilot.Application.Common.Interfaces;

public interface IPendingItemMappingRepository
{
    Task<PendingItemMapping?> GetByIdAsync(Guid id, Guid integrationId, CancellationToken cancellationToken = default);
    Task<PendingItemMapping?> GetByErpIdAsync(Guid integrationId, string erpId, CancellationToken cancellationToken = default);
    Task<IReadOnlyList<PendingItemMapping>> GetApprovedByIntegrationAsync(Guid integrationId, CancellationToken cancellationToken = default);
    Task<IReadOnlyList<PendingItemMapping>> GetAllByIntegrationAsync(Guid integrationId, CancellationToken cancellationToken = default);
    Task<PagedResult<PendingItemMapping>> GetPagedAsync(Guid integrationId, PendingItemMappingStatus? status, int page, int pageSize, CancellationToken cancellationToken = default);
    void Add(PendingItemMapping mapping);
    void Update(PendingItemMapping mapping);
    void Remove(PendingItemMapping mapping);
    Task SaveChangesAsync(CancellationToken cancellationToken = default);
}
