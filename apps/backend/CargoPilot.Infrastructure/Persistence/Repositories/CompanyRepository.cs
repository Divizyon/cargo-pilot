using CargoPilot.Application.Common.Interfaces;
using CargoPilot.Domain.Entities;

namespace CargoPilot.Infrastructure.Persistence.Repositories;

internal sealed class CompanyRepository : ICompanyRepository
{
    private readonly AppDbContext _dbContext;

    public CompanyRepository(AppDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    public void Add(Company company)
    {
        _dbContext.Companies.Add(company);
    }

    public Task SaveChangesAsync(CancellationToken cancellationToken = default)
    {
        return _dbContext.SaveChangesAsync(cancellationToken);
    }
}
