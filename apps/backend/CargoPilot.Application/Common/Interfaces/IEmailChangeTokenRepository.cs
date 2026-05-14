using CargoPilot.Domain.Entities;

namespace CargoPilot.Application.Common.Interfaces;

public interface IEmailChangeTokenRepository {
    Task<EmailChangeToken?> GetActiveByTokenHashAsync(
        string tokenHash,
        DateTime utcNow,
        CancellationToken cancellationToken = default);
    Task InvalidatePendingForUserAsync(Guid userId, CancellationToken cancellationToken = default);
    void Add(EmailChangeToken token);
    Task SaveChangesAsync(CancellationToken cancellationToken = default);
}
