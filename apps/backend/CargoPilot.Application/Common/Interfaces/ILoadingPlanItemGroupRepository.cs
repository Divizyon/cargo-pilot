using CargoPilot.Domain.Entities;

namespace CargoPilot.Application.Common.Interfaces;

public interface ILoadingPlanItemGroupRepository
{
    Task<LoadingPlanItemGroup?> GetByIdAsync(Guid id, Guid planId, CancellationToken cancellationToken = default);
    Task<IReadOnlyList<LoadingPlanItemGroup>> GetByPlanIdAsync(Guid planId, CancellationToken cancellationToken = default);
    Task<IReadOnlyList<LoadingPlanItemGroup>> GetByIdsAsync(IReadOnlyList<Guid> ids, Guid? companyId, CancellationToken cancellationToken = default);
    void Add(LoadingPlanItemGroup group);
    Task DeleteByPlanIdAsync(Guid planId, CancellationToken cancellationToken = default);
    Task NullifyGroupOnItemsAsync(Guid groupId, CancellationToken cancellationToken = default);
    Task DeleteItemsByGroupAsync(Guid groupId, CancellationToken cancellationToken = default);
    Task SaveChangesAsync(CancellationToken cancellationToken = default);
}
