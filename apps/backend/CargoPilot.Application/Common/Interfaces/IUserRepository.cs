using CargoPilot.Domain.Entities;
using CargoPilot.Domain.Enums;

namespace CargoPilot.Application.Common.Interfaces;

public interface IUserRepository
{
    Task<bool> ExistsByEmailAsync(string email, CancellationToken cancellationToken = default);
    void Add(AppUser user);
    Task SaveChangesAsync(CancellationToken cancellationToken = default);

    /// <summary>E-posta ile kullanıcı getirir; yoksa null döner.</summary>
    Task<AppUser?> FindByEmailAsync(string email, CancellationToken cancellationToken = default);

    /// <summary>OAuth provider + providerKey çiftiyle kullanıcı getirir; yoksa null döner.</summary>
    Task<AppUser?> FindByProviderAsync(AuthProvider provider, string providerKey, CancellationToken cancellationToken = default);

    /// <summary>Kullanıcıya yeni bir UserLogin kaydı ekler (hesap birleştirme — AC11).</summary>
    void AddUserLogin(UserLogin userLogin);
}
