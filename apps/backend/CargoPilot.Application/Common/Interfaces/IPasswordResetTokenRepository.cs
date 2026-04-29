using CargoPilot.Domain.Entities;

namespace CargoPilot.Application.Common.Interfaces;

public interface IPasswordResetTokenRepository {
    Task<PasswordResetToken?> GetActiveByTokenHashAsync(string tokenHash, CancellationToken cancellationToken = default);
    Task InvalidateAllForUserAsync(Guid userId, CancellationToken cancellationToken = default);
    void Add(PasswordResetToken token);
    Task SaveChangesAsync(CancellationToken cancellationToken = default);
}
