namespace CargoPilot.Domain.Entities;

public sealed class UserSession {
    public Guid Id { get; private set; }
    public DateTime CreatedAtUtc { get; private set; }
    public Guid UserId { get; private set; }
    /// <summary>
    /// Refresh token'ın SHA-256 hash'i. Ham token hiçbir zaman saklanmaz;
    /// yalnızca istemciye döner. Doğrulama gelen token'ın hash'i ile yapılır.
    /// </summary>
    public string TokenHash { get; private set; } = null!;
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
        string tokenHash,
        DateTime expiresAt,
        DateTime lastUsedAt,
        string? createdByIp = null,
        string? deviceSummary = null) {
        Id = id;
        CreatedAtUtc = DateTime.UtcNow;
        UserId = userId;
        TokenHash = tokenHash;
        CreatedByIp = createdByIp;
        ExpiresAt = expiresAt;
        LastUsedAt = lastUsedAt;
        IsRevoked = false;
        DeviceSummary = deviceSummary;
    }
}
