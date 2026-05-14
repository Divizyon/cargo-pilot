using CargoPilot.Domain.Entities;
using CargoPilot.Domain.Enums;

namespace CargoPilot.Application.Common.Interfaces;

public interface IUserRepository
{
    Task<bool> ExistsByEmailAsync(string email, CancellationToken cancellationToken = default);
    Task<AppUser?> GetByEmailAsync(string email, CancellationToken cancellationToken = default);
    Task<AppUser?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default);
    void Add(AppUser user);
    Task SaveChangesAsync(CancellationToken cancellationToken = default);

    /// <summary>E-posta ile kullanıcı getirir; yoksa null döner.</summary>
    Task<AppUser?> FindByEmailAsync(string email, CancellationToken cancellationToken = default);

    /// <summary>OAuth provider + providerKey çiftiyle kullanıcı getirir; yoksa null döner.</summary>
    Task<AppUser?> FindByProviderAsync(AuthProvider provider, string providerKey, CancellationToken cancellationToken = default);

    /// <summary>Kullanıcıya yeni bir UserLogin kaydı ekler (hesap birleştirme — AC11).</summary>
    void AddUserLogin(UserLogin userLogin);

    /// <summary>Kullanıcıyı Company navigation ile birlikte getirir; yoksa null döner.</summary>
    Task<AppUser?> GetByIdWithCompanyAsync(Guid id, CancellationToken cancellationToken = default);
    Task<IReadOnlyDictionary<Guid, AppUser>> GetByIdsAsync(IEnumerable<Guid> ids, CancellationToken cancellationToken = default);

    Task<AppUser?> GetCompanyAdminAsync(Guid companyId, CancellationToken cancellationToken = default);
    Task<IReadOnlyList<AppUser>> GetCompanyUsersAsync(Guid companyId, CancellationToken cancellationToken = default);
    Task<int> GetCompanyUserCountAsync(Guid companyId, CancellationToken cancellationToken = default);
    /// <summary>Belirtilen şirkette aktif CompanyAdmin sayısını döner.</summary>
    Task<int> GetActiveAdminCountAsync(Guid companyId, CancellationToken cancellationToken = default);
    /// <summary>Kullanıcının tüm aktif oturumlarını iptal eder.</summary>
    Task RevokeAllSessionsAsync(Guid userId, CancellationToken cancellationToken = default);
}
