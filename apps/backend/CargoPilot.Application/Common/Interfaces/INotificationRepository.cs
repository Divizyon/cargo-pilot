using CargoPilot.Domain.Entities;
using CargoPilot.Domain.Enums;

namespace CargoPilot.Application.Common.Interfaces;

public interface INotificationRepository
{
    void Add(Notification notification);

    // Returns up to PageSize+1 items; caller checks count > PageSize to determine hasMore.
    Task<IReadOnlyList<Notification>> GetPagedAsync(
        Guid userId,
        DateTime? cursor,
        IReadOnlyList<NotificationType>? types,
        NotificationSeverity? severity,
        bool? isRead,
        string? searchText,
        CancellationToken cancellationToken = default);

    Task<int> GetUnreadCountAsync(Guid userId, CancellationToken cancellationToken = default);

    Task<Notification?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default);

    Task MarkAsReadAsync(Guid id, Guid userId, CancellationToken cancellationToken = default);

    Task MarkAllAsReadAsync(Guid userId, CancellationToken cancellationToken = default);

    Task SoftDeleteAsync(Guid id, Guid userId, CancellationToken cancellationToken = default);

    Task BulkSoftDeleteAsync(IEnumerable<Guid> ids, Guid userId, CancellationToken cancellationToken = default);

    Task<bool> ExistsTodayByTypeAsync(Guid userId, NotificationType type, CancellationToken cancellationToken = default);

    Task HardDeleteOlderThanAsync(DateTime cutoff, CancellationToken cancellationToken = default);

    Task SaveChangesAsync(CancellationToken cancellationToken = default);
}
