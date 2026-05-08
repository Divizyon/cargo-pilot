using CargoPilot.Domain.Entities;

namespace CargoPilot.Application.Common.Interfaces;

public interface ICompanyRepository
{
    void Add(Company company);
    Task SaveChangesAsync(CancellationToken cancellationToken = default);
}
