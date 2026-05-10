using CargoPilot.Application.Abstractions;
using CargoPilot.Application.Common.Interfaces;
using CargoPilot.Domain.Enums;

namespace CargoPilot.Infrastructure.Jobs;

public sealed class TrialExpiryNotificationJob
{
    private readonly ICompanyRepository _companyRepository;
    private readonly INotificationRepository _notificationRepository;
    private readonly INotificationService _notificationService;

    public TrialExpiryNotificationJob(
        ICompanyRepository companyRepository,
        INotificationRepository notificationRepository,
        INotificationService notificationService)
    {
        _companyRepository     = companyRepository;
        _notificationRepository = notificationRepository;
        _notificationService   = notificationService;
    }

    public async Task RunAsync()
    {
        await SendExpiringNotificationsAsync();
        await SendExpiredNotificationsAsync();
    }

    private async Task SendExpiringNotificationsAsync()
    {
        var companies = await _companyRepository.GetExpiringTrialCompaniesAsync(7);
        var now       = DateTime.UtcNow;

        foreach (var company in companies)
        {
            var admin = company.Users.FirstOrDefault(u => u.UserType == UserType.CompanyAdmin);
            if (admin is null) continue;

            var alreadySent = await _notificationRepository.ExistsTodayByTypeAsync(
                admin.Id, NotificationType.TrialExpiring);
            if (alreadySent) continue;

            var daysLeft = (int)Math.Ceiling((company.TrialEndsAt!.Value - now).TotalDays);

            await _notificationService.CreateAsync(
                userId: admin.Id,
                companyId: company.Id,
                type: NotificationType.TrialExpiring,
                title: "Deneme süreniz dolmak üzere",
                description: $"{daysLeft} gün sonra sona erecek. Plan seçerek devam edin.");
        }
    }

    private async Task SendExpiredNotificationsAsync()
    {
        var companies = await _companyRepository.GetExpiredTrialCompaniesAsync();

        foreach (var company in companies)
        {
            var admin = company.Users.FirstOrDefault(u => u.UserType == UserType.CompanyAdmin);
            if (admin is null) continue;

            var alreadySent = await _notificationRepository.ExistsTodayByTypeAsync(
                admin.Id, NotificationType.TrialExpired);
            if (alreadySent) continue;

            await _notificationService.CreateAsync(
                userId: admin.Id,
                companyId: company.Id,
                type: NotificationType.TrialExpired,
                title: "Deneme süreniz sona erdi",
                description: "Platformun tüm özelliklerine erişmek için bir plan seçin.");
        }
    }
}
