namespace CargoPilot.Domain.Entities;

public sealed class UserPasswordHistory {
    public Guid Id { get; private set; }
    public Guid UserId { get; private set; }
    public string PasswordHash { get; private set; } = null!;
    public DateTime CreatedAtUtc { get; private set; }

#pragma warning disable S1144
    public AppUser User { get; private set; } = null!;
#pragma warning restore S1144

    private UserPasswordHistory() { }

    public UserPasswordHistory(Guid id, Guid userId, string passwordHash) {
        Id = id;
        UserId = userId;
        PasswordHash = passwordHash;
        CreatedAtUtc = DateTime.UtcNow;
    }
}
