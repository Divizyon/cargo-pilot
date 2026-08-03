namespace CargoPilot.Domain.Entities;

public sealed class UserSession {
    public Guid Id { get; private set; }
    public DateTime CreatedAtUtc { get; private set; }
    public Guid UserId { get; private set; }
    public string Token { get; private set; } = null!;
    public string? CreatedByIp { get; private set; }
    public DateTime ExpiresAt { get; private set; }
    public DateTime LastUsedAt { get; private set; }
    public bool IsRevoked { get; private set; }
    public string? DeviceSummary { get; private set; }

    public AppUser User { get; private set; } = null!;

    private UserSession() { }

    /// <summary>
    /// Bu oturumu iptal eder. Token rotation sırasında eski session geçersiz kılınır.
    /// </summary>
    public void Revoke() => IsRevoked = true;

    public UserSession(
        Guid id,
        Guid userId,
        string token,
        DateTime expiresAt,
        DateTime lastUsedAt,
        string? createdByIp = null,
        string? deviceSummary = null) {
        Id = id;
        CreatedAtUtc = DateTime.UtcNow;
        UserId = userId;
        Token = token;
        CreatedByIp = createdByIp;
        ExpiresAt = expiresAt;
        LastUsedAt = lastUsedAt;
        IsRevoked = false;
        DeviceSummary = deviceSummary;
    }
}
