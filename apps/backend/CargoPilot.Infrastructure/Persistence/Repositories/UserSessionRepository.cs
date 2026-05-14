using CargoPilot.Application.Common.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace CargoPilot.Infrastructure.Persistence.Repositories;

internal sealed class UserSessionRepository : IUserSessionRepository {
    private readonly AppDbContext _dbContext;

    public UserSessionRepository(AppDbContext dbContext) {
        _dbContext = dbContext;
    }

    public Task RevokeAllAsync(Guid userId, CancellationToken cancellationToken = default) {
        return _dbContext.UserSessions
            .Where(s => s.UserId == userId && !s.IsRevoked)
            .ExecuteUpdateAsync(
                setters => setters.SetProperty(s => s.IsRevoked, true),
                cancellationToken);
    }
}
