using CargoPilot.Application.Common.Interfaces;

namespace CargoPilot.Infrastructure.Jobs;

public sealed class NotificationCleanupJob
{
    private const int RetentionDays = 90;

    private readonly INotificationRepository _repository;

    public NotificationCleanupJob(INotificationRepository repository)
    {
        _repository = repository;
    }

    public Task RunAsync()
    {
        var cutoff = DateTime.UtcNow.AddDays(-RetentionDays);
        return _repository.HardDeleteOlderThanAsync(cutoff);
    }
}
