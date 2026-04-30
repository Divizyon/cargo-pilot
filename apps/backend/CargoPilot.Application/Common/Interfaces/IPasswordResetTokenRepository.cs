using CargoPilot.Domain.Entities;

namespace CargoPilot.Application.Common.Interfaces;

public interface IPasswordResetTokenRepository {
    Task<Guid?> TryConsumeActiveTokenAsync(
        string tokenHash,
        DateTime utcNow,
        CancellationToken cancellationToken = default);
    Task InvalidateAllForUserAsync(Guid userId, CancellationToken cancellationToken = default);
    void Add(PasswordResetToken token);
    Task SaveChangesAsync(CancellationToken cancellationToken = default);
}
