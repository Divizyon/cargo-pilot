using CargoPilot.Application.Common.Interfaces;
using CargoPilot.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace CargoPilot.Infrastructure.Persistence.Repositories;

internal sealed class PasswordResetTokenRepository : IPasswordResetTokenRepository {
    private readonly AppDbContext _dbContext;

    public PasswordResetTokenRepository(AppDbContext dbContext) {
        _dbContext = dbContext;
    }

    public Task<PasswordResetToken?> GetActiveByTokenHashAsync(
        string tokenHash,
        CancellationToken cancellationToken = default) {
        return _dbContext.PasswordResetTokens
            .FirstOrDefaultAsync(t => t.TokenHash == tokenHash && !t.IsUsed, cancellationToken);
    }

    public async Task InvalidateAllForUserAsync(
        Guid userId,
        CancellationToken cancellationToken = default) {
        var activeTokens = await _dbContext.PasswordResetTokens
            .Where(t => t.UserId == userId && !t.IsUsed)
            .ToListAsync(cancellationToken);

        foreach (var token in activeTokens)
            token.MarkAsUsed();
    }

    public void Add(PasswordResetToken token) {
        _dbContext.PasswordResetTokens.Add(token);
    }

    public Task SaveChangesAsync(CancellationToken cancellationToken = default) {
        return _dbContext.SaveChangesAsync(cancellationToken);
    }
}
