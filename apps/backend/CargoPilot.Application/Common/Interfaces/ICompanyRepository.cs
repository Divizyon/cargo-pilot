using CargoPilot.Domain.Entities;

namespace CargoPilot.Application.Common.Interfaces;

public interface ICompanyRepository
{
    Task<IReadOnlyList<Company>> GetExpiringTrialCompaniesAsync(int daysAhead, CancellationToken cancellationToken = default);

    Task<IReadOnlyList<Company>> GetExpiredTrialCompaniesAsync(CancellationToken cancellationToken = default);
}
