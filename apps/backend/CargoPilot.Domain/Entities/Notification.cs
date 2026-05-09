using CargoPilot.Domain.Enums;

namespace CargoPilot.Domain.Entities;

public sealed class Notification : BaseEntity
{
    public Guid UserId { get; private set; }
    public Guid? CompanyId { get; private set; }
    public NotificationType Type { get; private set; }
    public NotificationSeverity Severity { get; private set; }
    public string Title { get; private set; } = null!;
    public string Description { get; private set; } = null!;
    public string? ActionUrl { get; private set; }
    public bool IsRead { get; private set; }
    public DateTime? ReadAt { get; private set; }

    private Notification() { }

    public Notification(
        Guid id,
        Guid userId,
        Guid? companyId,
        NotificationType type,
        NotificationSeverity severity,
        string title,
        string description,
        string? actionUrl = null) : base(id)
    {
        UserId = userId;
        CompanyId = companyId;
        Type = type;
        Severity = severity;
        Title = title;
        Description = description;
        ActionUrl = actionUrl;
        IsRead = false;
    }

    public void MarkAsRead()
    {
        IsRead = true;
        ReadAt = DateTime.UtcNow;
    }
}
