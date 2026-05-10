using CargoPilot.Application.Common.Interfaces;
using CargoPilot.Domain.Entities;
using Microsoft.EntityFrameworkCore;

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

    public async Task<IReadOnlyList<Company>> GetExpiringTrialCompaniesAsync(
        int daysAhead,
        CancellationToken cancellationToken = default)
    {
        var now    = DateTime.UtcNow;
        var cutoff = now.AddDays(daysAhead);

        return await _dbContext.Companies
            .Include(c => c.Users)
            .Where(c => c.TrialEndsAt > now && c.TrialEndsAt <= cutoff)
            .ToListAsync(cancellationToken);
    }

    public async Task<IReadOnlyList<Company>> GetExpiredTrialCompaniesAsync(
        CancellationToken cancellationToken = default)
    {
        var now = DateTime.UtcNow;

        return await _dbContext.Companies
            .Include(c => c.Users)
            .Where(c => c.TrialEndsAt != null && c.TrialEndsAt <= now)
            .ToListAsync(cancellationToken);
    }
}
