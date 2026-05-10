using CargoPilot.Domain.Enums;

namespace CargoPilot.Application.Abstractions;

public interface INotificationService
{
    Task CreateAsync(
        Guid userId,
        Guid? companyId,
        NotificationType type,
        string title,
        string description,
        string? actionUrl = null,
        Guid? integrationId = null,
        CancellationToken cancellationToken = default);
}
