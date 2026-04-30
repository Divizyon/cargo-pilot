using CargoPilot.Application.Common.Interfaces;
using CargoPilot.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace CargoPilot.Infrastructure.Persistence.Repositories;

internal sealed class UserPasswordHistoryRepository : IUserPasswordHistoryRepository {
    private readonly AppDbContext _dbContext;

    public UserPasswordHistoryRepository(AppDbContext dbContext) {
        _dbContext = dbContext;
    }

    public async Task<IReadOnlyList<string>> GetLastHashesAsync(
        Guid userId,
        int count,
        CancellationToken cancellationToken = default) {
        return await _dbContext.UserPasswordHistory
            .Where(h => h.UserId == userId)
            .OrderByDescending(h => h.CreatedAtUtc)
            .Take(count)
            .Select(h => h.PasswordHash)
            .ToListAsync(cancellationToken);
    }

    public void Add(UserPasswordHistory entry) {
        _dbContext.UserPasswordHistory.Add(entry);
    }
}
