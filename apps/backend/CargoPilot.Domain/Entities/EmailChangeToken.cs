namespace CargoPilot.Domain.Entities;

public sealed class EmailChangeToken {
    public Guid Id { get; private set; }
    public Guid UserId { get; private set; }
    public string NewEmail { get; private set; } = null!;
    public string TokenHash { get; private set; } = null!;
    public DateTime ExpiresAt { get; private set; }
    public bool IsUsed { get; private set; }
    public DateTime CreatedAtUtc { get; private set; }

#pragma warning disable S1144
    public AppUser User { get; private set; } = null!;
#pragma warning restore S1144

    private EmailChangeToken() { }

    public EmailChangeToken(Guid id, Guid userId, string newEmail, string tokenHash, DateTime expiresAt) {
        Id = id;
        UserId = userId;
        NewEmail = newEmail;
        TokenHash = tokenHash;
        ExpiresAt = expiresAt;
        IsUsed = false;
        CreatedAtUtc = DateTime.UtcNow;
    }

    public void MarkAsUsed() => IsUsed = true;
}
