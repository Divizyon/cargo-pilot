using CargoPilot.Domain.Enums;

namespace CargoPilot.Domain.Entities;

public sealed class UserLogin {
    public Guid Id { get; private set; }
    public DateTime CreatedAtUtc { get; private set; }
    public AuthProvider LoginProvider { get; private set; }
    public string ProviderKey { get; private set; } = null!;
    public Guid UserId { get; private set; }

    public AppUser User { get; private set; } = null!;

    private UserLogin() { }

    public UserLogin(Guid id, AuthProvider loginProvider, string providerKey, Guid userId) {
        Id = id;
        CreatedAtUtc = DateTime.UtcNow;
        LoginProvider = loginProvider;
        ProviderKey = providerKey;
        UserId = userId;
    }
}
