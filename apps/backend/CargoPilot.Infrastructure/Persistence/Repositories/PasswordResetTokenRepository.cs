using CargoPilot.Application.Common.Interfaces;
using CargoPilot.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace CargoPilot.Infrastructure.Persistence.Repositories;

internal sealed class PasswordResetTokenRepository : IPasswordResetTokenRepository {
    private readonly AppDbContext _dbContext;

    public PasswordResetTokenRepository(AppDbContext dbContext) {
        _dbContext = dbContext;
    }

    public async Task<Guid?> TryConsumeActiveTokenAsync(
        string tokenHash,
        DateTime utcNow,
        CancellationToken cancellationToken = default) {
        var candidate = await _dbContext.PasswordResetTokens
            .Where(t => t.TokenHash == tokenHash && !t.IsUsed && t.ExpiresAt > utcNow)
            .Select(t => new { t.Id, t.UserId })
            .FirstOrDefaultAsync(cancellationToken);

        if (candidate is null)
            return null;

        var affectedRows = await _dbContext.PasswordResetTokens
            .Where(t => t.Id == candidate.Id && !t.IsUsed && t.ExpiresAt > utcNow)
            .ExecuteUpdateAsync(setters => setters.SetProperty(t => t.IsUsed, true), cancellationToken);

        return affectedRows == 1 ? candidate.UserId : null;
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
