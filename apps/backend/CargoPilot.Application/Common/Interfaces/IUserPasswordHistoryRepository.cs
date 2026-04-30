using CargoPilot.Domain.Entities;

namespace CargoPilot.Application.Common.Interfaces;

public interface IUserPasswordHistoryRepository {
    Task<IReadOnlyList<string>> GetLastHashesAsync(Guid userId, int count, CancellationToken cancellationToken = default);
    void Add(UserPasswordHistory entry);
}
