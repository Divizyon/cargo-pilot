using CargoPilot.Domain.Entities;

namespace CargoPilot.Application.Abstractions;

public interface IUserRepository {
    Task<bool> ExistsByEmailAsync(string email, CancellationToken cancellationToken = default);
    void Add(AppUser user);
    Task SaveChangesAsync(CancellationToken cancellationToken = default);
}
