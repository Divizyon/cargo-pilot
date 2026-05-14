namespace CargoPilot.Application.Common.Interfaces;

public interface IUserSessionRepository {
    Task RevokeAllAsync(Guid userId, CancellationToken cancellationToken = default);
}
