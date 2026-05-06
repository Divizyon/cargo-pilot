using CargoPilot.Application.Common.Interfaces;
using CargoPilot.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace CargoPilot.Infrastructure.Persistence.Repositories;

internal sealed class BusinessRuleRepository : IBusinessRuleRepository
{
    private readonly AppDbContext _dbContext;

    public BusinessRuleRepository(AppDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    public Task<BusinessRule?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default)
        => _dbContext.BusinessRules.FirstOrDefaultAsync(r => r.Id == id, cancellationToken);

    public async Task<IReadOnlyList<BusinessRule>> ListAllAsync(CancellationToken cancellationToken = default)
        => await _dbContext.BusinessRules
            .AsNoTracking()
            .OrderBy(r => r.PriorityLevel)
            .ThenBy(r => r.RuleName)
            .ToListAsync(cancellationToken);

    public void Add(BusinessRule rule) => _dbContext.BusinessRules.Add(rule);

    public void Update(BusinessRule rule) => _dbContext.BusinessRules.Update(rule);

    public Task SaveChangesAsync(CancellationToken cancellationToken = default)
        => _dbContext.SaveChangesAsync(cancellationToken);
}
