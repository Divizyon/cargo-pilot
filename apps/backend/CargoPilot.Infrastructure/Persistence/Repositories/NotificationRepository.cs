using CargoPilot.Application.Common.Interfaces;
using CargoPilot.Domain.Entities;
using CargoPilot.Domain.Enums;
using Microsoft.EntityFrameworkCore;

namespace CargoPilot.Infrastructure.Persistence.Repositories;

internal sealed class NotificationRepository : INotificationRepository
{
    private const int PageSize = 20;

    private readonly AppDbContext _dbContext;

    public NotificationRepository(AppDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    public void Add(Notification notification)
    {
        _dbContext.Notifications.Add(notification);
    }

    public async Task<IReadOnlyList<Notification>> GetPagedAsync(
        Guid userId,
        DateTime? cursor,
        IReadOnlyList<NotificationType>? types,
        NotificationSeverity? severity,
        bool? isRead,
        string? searchText,
        CancellationToken cancellationToken = default)
    {
        var query = _dbContext.Notifications
            .AsNoTracking()
            .Where(n => n.UserId == userId);

        if (cursor.HasValue)
            query = query.Where(n => n.CreatedAtUtc < cursor.Value);

        if (types != null && types.Count > 0)
            query = query.Where(n => types.Contains(n.Type));

        if (severity.HasValue)
            query = query.Where(n => n.Severity == severity.Value);

        if (isRead.HasValue)
            query = query.Where(n => n.IsRead == isRead.Value);

        if (!string.IsNullOrWhiteSpace(searchText))
        {
            var term = searchText.Trim();
            query = query.Where(n => n.Title.Contains(term) || n.Description.Contains(term));
        }

        return await query
            .OrderByDescending(n => n.CreatedAtUtc)
            .Take(PageSize + 1)
            .ToListAsync(cancellationToken);
    }

    public Task<int> GetUnreadCountAsync(Guid userId, CancellationToken cancellationToken = default)
    {
        return _dbContext.Notifications
            .CountAsync(n => n.UserId == userId && !n.IsRead, cancellationToken);
    }

    public Task<Notification?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default)
    {
        return _dbContext.Notifications
            .FirstOrDefaultAsync(n => n.Id == id, cancellationToken);
    }

    public async Task MarkAsReadAsync(Guid id, Guid userId, CancellationToken cancellationToken = default)
    {
        var notification = await _dbContext.Notifications
            .FirstOrDefaultAsync(n => n.Id == id && n.UserId == userId, cancellationToken);

        if (notification is not null && !notification.IsRead)
            notification.MarkAsRead();
    }

    public Task MarkAllAsReadAsync(Guid userId, CancellationToken cancellationToken = default)
    {
        var now = DateTime.UtcNow;
        return _dbContext.Notifications
            .Where(n => n.UserId == userId && !n.IsRead)
            .ExecuteUpdateAsync(
                s => s
                    .SetProperty(n => n.IsRead, true)
                    .SetProperty(n => n.ReadAt, now),
                cancellationToken);
    }

    public async Task SoftDeleteAsync(Guid id, Guid userId, CancellationToken cancellationToken = default)
    {
        var notification = await _dbContext.Notifications
            .FirstOrDefaultAsync(n => n.Id == id && n.UserId == userId, cancellationToken);

        notification?.MarkAsDeleted();
    }

    public Task BulkSoftDeleteAsync(
        IEnumerable<Guid> ids,
        Guid userId,
        CancellationToken cancellationToken = default)
    {
        var idList = ids.ToList();
        var now = DateTime.UtcNow;

        return _dbContext.Notifications
            .Where(n => idList.Contains(n.Id) && n.UserId == userId)
            .ExecuteUpdateAsync(
                s => s
                    .SetProperty(n => n.IsDeleted, true)
                    .SetProperty(n => n.IsActive, false)
                    .SetProperty(n => n.DeletedAtUtc, now),
                cancellationToken);
    }

    public Task<bool> ExistsTodayByTypeAsync(Guid userId, NotificationType type, CancellationToken cancellationToken = default)
    {
        var todayStart = DateTime.UtcNow.Date;
        var todayEnd   = todayStart.AddDays(1);
        return _dbContext.Notifications
            .AnyAsync(
                n => n.UserId == userId && n.Type == type &&
                     n.CreatedAtUtc >= todayStart && n.CreatedAtUtc < todayEnd,
                cancellationToken);
    }

    public Task HardDeleteOlderThanAsync(DateTime cutoff, CancellationToken cancellationToken = default)
    {
        return _dbContext.Notifications
            .IgnoreQueryFilters()
            .Where(n => n.IsDeleted && n.DeletedAtUtc != null && n.DeletedAtUtc < cutoff)
            .ExecuteDeleteAsync(cancellationToken);
    }

    public Task SaveChangesAsync(CancellationToken cancellationToken = default)
    {
        return _dbContext.SaveChangesAsync(cancellationToken);
    }
}
