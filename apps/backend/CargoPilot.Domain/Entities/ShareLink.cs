namespace CargoPilot.Domain.Entities;

public sealed class ShareLink
{
    public Guid Id { get; private set; }
    public Guid PlanId { get; private set; }
    public Guid CreatedByUserId { get; private set; }
    public string Token { get; private set; } = null!;
    public string Validity { get; private set; } = null!;
    public DateTime? ExpiresAt { get; private set; }
    public DateTime CreatedAtUtc { get; private set; }
    public int ViewCount { get; private set; }

#pragma warning disable S1144
    public LoadingPlan Plan { get; private set; } = null!;
#pragma warning restore S1144

    public bool IsExpired => ExpiresAt.HasValue && DateTime.UtcNow > ExpiresAt.Value;

    private ShareLink() { }

    public ShareLink(Guid id, Guid planId, Guid createdByUserId, string token, string validity, DateTime? expiresAt)
    {
        Id = id;
        PlanId = planId;
        CreatedByUserId = createdByUserId;
        Token = token;
        Validity = validity;
        ExpiresAt = expiresAt;
        CreatedAtUtc = DateTime.UtcNow;
        ViewCount = 0;
    }

    public void IncrementViewCount() => ViewCount++;
}
