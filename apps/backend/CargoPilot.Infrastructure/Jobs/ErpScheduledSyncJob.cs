using CargoPilot.Application.Common.Erp;
using CargoPilot.Application.Common.Interfaces;
using CargoPilot.Application.Features.Integrations.SyncErpItems;
using CargoPilot.Domain.Entities;
using MediatR;
using Microsoft.Extensions.Logging;

namespace CargoPilot.Infrastructure.Jobs;

/// <summary>
/// Vadesi gelen entegrasyonlarin otomatik senkronizasyonu. Recurring job periyodik olarak
/// tarama yapar; her entegrasyon icin manuel tetikle ayni komut (SyncErpItemsCommand) calisir,
/// boylece kilit, muhasebe ve taslak yazimi tek yerde kalir.
/// </summary>
/// <remarks>
/// Delta sync mumkun degildir: Netsis TBLSTSABIT'te satir bazli degisiklik damgasi yoktur,
/// bu yuzden her calisma tam tablo taramasidir. Maliyet, sorgudaki TOP limiti
/// (<see cref="Services.Erp.NetsisProductFetcher.MaxRowCount"/>) ile sinirlandirilir; limit
/// asilirsa kalan satirlar bir sonraki calismaya kalir ve uyari loglanir.
/// </remarks>
public sealed partial class ErpScheduledSyncJob
{
    /// <summary>15 dakikada bir tarama; en kisa frekans (4 saat) icin yeterli cozunurluk.</summary>
    public const string CronExpression = "*/15 * * * *";

    private const string AlreadyRunningErrorCode = "Sync.AlreadyRunning";

    private readonly IIntegrationRepository _integrationRepository;
    private readonly ISender _sender;
    private readonly ILogger<ErpScheduledSyncJob> _logger;

    public ErpScheduledSyncJob(
        IIntegrationRepository integrationRepository,
        ISender sender,
        ILogger<ErpScheduledSyncJob> logger)
    {
        _integrationRepository = integrationRepository;
        _sender = sender;
        _logger = logger;
    }

    /// <summary>Vadesi gelen tum entegrasyonlari sirayla senkronize eder.</summary>
    public async Task RunAsync(CancellationToken cancellationToken = default)
    {
        var scanStartedAtUtc = DateTime.UtcNow;
        var dueIntegrations = await _integrationRepository.ListDueForScheduledSyncAsync(
            scanStartedAtUtc, cancellationToken);

        foreach (var integration in dueIntegrations)
        {
            cancellationToken.ThrowIfCancellationRequested();

            var result = await _sender.Send(
                new SyncErpItemsCommand(
                    integration.Id,
                    CategoryFilter: null,
                    WarehouseFilter: null,
                    CompanyIdOverride: integration.CompanyId),
                cancellationToken);

            if (result.IsSuccess)
            {
                LogSyncCompleted(integration.Id, integration.CompanyId);
                continue;
            }

            // Sirkette calisan sync varsa vade korunur: entegrasyon bir sonraki taramada tekrar denenir.
            if (result.Error?.Code == AlreadyRunningErrorCode)
            {
                LogSyncSkipped(integration.Id, integration.CompanyId);
                continue;
            }

            LogSyncFailed(result.Error?.Description ?? "Bilinmeyen hata", integration.Id, integration.CompanyId);
            await AdvanceScheduleIfStillDueAsync(integration, scanStartedAtUtc, cancellationToken);
        }
    }

    /// <summary>
    /// Sync baslamadan reddedilen denemelerde (or. ERP ayari eksik) vade hala gecmistedir;
    /// her taramada ayni hatanin tekrarlanmamasi icin bir sonraki vadeye tasinir.
    /// Sync gercekten baslamissa vadeyi komut zaten ilerletmistir ve burada dokunulmaz.
    /// </summary>
    private async Task AdvanceScheduleIfStillDueAsync(
        Integration integration, DateTime scanStartedAtUtc, CancellationToken cancellationToken)
    {
        if (integration.NextScheduledSyncAt > scanStartedAtUtc)
            return;

        integration.RescheduleNextSync(
            ErpSyncPolicy.NextScheduledSyncAt(integration.SyncFrequency, DateTime.UtcNow));
        await _integrationRepository.SaveChangesAsync(cancellationToken);
    }

    [LoggerMessage(Level = LogLevel.Information, Message = "Zamanlanmis ERP sync tamamlandi. IntegrationId={IntegrationId} CompanyId={CompanyId}")]
    private partial void LogSyncCompleted(Guid integrationId, Guid companyId);

    [LoggerMessage(Level = LogLevel.Information, Message = "Zamanlanmis ERP sync atlandi: sirkette calisan sync var. IntegrationId={IntegrationId} CompanyId={CompanyId}")]
    private partial void LogSyncSkipped(Guid integrationId, Guid companyId);

    [LoggerMessage(Level = LogLevel.Error, Message = "Zamanlanmis ERP sync basarisiz: {Reason} IntegrationId={IntegrationId} CompanyId={CompanyId}")]
    private partial void LogSyncFailed(string reason, Guid integrationId, Guid companyId);
}
