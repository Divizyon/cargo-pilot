using CargoPilot.Domain.Entities;

namespace CargoPilot.Application.Common.Interfaces;

public interface IBusinessRuleRepository
{
    Task<BusinessRule?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default);
    Task<IReadOnlyList<BusinessRule>> ListAllAsync(CancellationToken cancellationToken = default);
    void Add(BusinessRule rule);
    void Update(BusinessRule rule);
    Task SaveChangesAsync(CancellationToken cancellationToken = default);
}
