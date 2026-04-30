namespace CargoPilot.Domain.Entities;

public sealed class PasswordResetToken {
    public Guid Id { get; private set; }
    public Guid UserId { get; private set; }
    public string TokenHash { get; private set; } = null!;
    public DateTime ExpiresAt { get; private set; }
    public bool IsUsed { get; private set; }
    public DateTime CreatedAtUtc { get; private set; }

#pragma warning disable S1144
    public AppUser User { get; private set; } = null!;
#pragma warning restore S1144

    private PasswordResetToken() { }

    public PasswordResetToken(Guid id, Guid userId, string tokenHash, DateTime expiresAt) {
        Id = id;
        UserId = userId;
        TokenHash = tokenHash;
        ExpiresAt = expiresAt;
        IsUsed = false;
        CreatedAtUtc = DateTime.UtcNow;
    }

    public void MarkAsUsed() => IsUsed = true;
}
