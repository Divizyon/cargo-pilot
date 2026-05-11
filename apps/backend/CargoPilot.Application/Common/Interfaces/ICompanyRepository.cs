using CargoPilot.Domain.Entities;

namespace CargoPilot.Application.Common.Interfaces;

public interface ICompanyRepository
{
    void Add(Company company);
    Task<Company?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default);

    Task<IReadOnlyList<Company>> GetExpiringTrialCompaniesAsync(int daysAhead, CancellationToken cancellationToken = default);

    Task<IReadOnlyList<Company>> GetExpiredTrialCompaniesAsync(CancellationToken cancellationToken = default);
}
