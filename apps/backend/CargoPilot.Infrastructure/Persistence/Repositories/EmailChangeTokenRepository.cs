using CargoPilot.Application.Common.Interfaces;
using CargoPilot.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace CargoPilot.Infrastructure.Persistence.Repositories;

internal sealed class EmailChangeTokenRepository : IEmailChangeTokenRepository {
    private readonly AppDbContext _dbContext;

    public EmailChangeTokenRepository(AppDbContext dbContext) {
        _dbContext = dbContext;
    }

    public Task<EmailChangeToken?> GetActiveByTokenHashAsync(
        string tokenHash,
        DateTime utcNow,
        CancellationToken cancellationToken = default) {
        return _dbContext.EmailChangeTokens
            .FirstOrDefaultAsync(
                t => t.TokenHash == tokenHash && !t.IsUsed && t.ExpiresAt > utcNow,
                cancellationToken);
    }

    public async Task InvalidatePendingForUserAsync(
        Guid userId,
        CancellationToken cancellationToken = default) {
        var pending = await _dbContext.EmailChangeTokens
            .Where(t => t.UserId == userId && !t.IsUsed)
            .ToListAsync(cancellationToken);

        foreach (var token in pending)
            token.MarkAsUsed();
    }

    public void Add(EmailChangeToken token) {
        _dbContext.EmailChangeTokens.Add(token);
    }

    public Task SaveChangesAsync(CancellationToken cancellationToken = default) {
        return _dbContext.SaveChangesAsync(cancellationToken);
    }
}
