using CargoPilot.Application.Common.Interfaces;
using CargoPilot.Domain.Entities;
using Hangfire;
using Microsoft.Extensions.Logging;

namespace CargoPilot.Infrastructure.Jobs;

[AutomaticRetry(Attempts = 3)]
public sealed partial class ErpExportJob {
    private readonly ILoadingPlanRepository _planRepository;
    private readonly IIntegrationRepository _integrationRepository;
    private readonly IErpExportService _erpExportService;
    private readonly ILogger<ErpExportJob> _logger;

    public ErpExportJob(
        ILoadingPlanRepository planRepository,
        IIntegrationRepository integrationRepository,
        IErpExportService erpExportService,
        ILogger<ErpExportJob> logger)
    {
        _planRepository = planRepository;
        _integrationRepository = integrationRepository;
        _erpExportService = erpExportService;
        _logger = logger;
    }

    public async Task ExecuteAsync(Guid loadingPlanId, Guid companyId, CancellationToken cancellationToken = default)
    {
        var plan = await _planRepository.GetByIdAsync(loadingPlanId, companyId, cancellationToken);
        if (plan is null)
        {
            // Plan bulunamadı — silinmiş veya yanlış companyId. Yeniden denemeye gerek yok.
            LogPlanNotFound(loadingPlanId, companyId);
            return;
        }

        // Retry şeffaflığı: önceki deneme Failed bırakmış olabilir; her deneme Pending ile başlar.
        plan.MarkErpPending();

        var integrations = await _integrationRepository.ListByCompanyAsync(companyId, cancellationToken);

        // Birden fazla bağlantıda hedef entegrasyonun plandan ya da ayarlardan seçilmesi
        // ERP-18 kapsamındadır; şimdilik şirketin ilk bağlantısı kullanılıyor.
        var integration = integrations.Count > 0 ? integrations[0] : null;

        if (integration is null) {
            // Senkronizasyon kaydı bir entegrasyona bağlı olduğundan burada kayıt açılamaz.
            // Neden operasyon loglarında görünür, kullanıcıya plan onayı yanıtında bildirilir.
            LogNoIntegration(plan.Id, companyId);
            plan.MarkErpFailed();
            await _planRepository.SaveChangesAsync(cancellationToken);
            return;
        }

        var syncLog = new SyncLog(Guid.NewGuid(), integration.Id, plan.Id);
        _integrationRepository.AddSyncLog(syncLog);

        try {
            var exportResult = await _erpExportService.ExportAsync(plan, integration, cancellationToken);

            if (exportResult.IsSuccess) {
                syncLog.Complete(exportResult.Data);
                plan.MarkErpSent();
            }
            else {
                // Aktarım yapılmadıysa başarı kaydı üretilmez.
                var reason = exportResult.Error?.Description ?? "ERP aktarımı başarısız.";
                LogExportFailed(reason, plan.Id, integration.Id);
                syncLog.Fail(reason);
                plan.MarkErpFailed();
            }

            // Tek SaveChanges: plan durumu + syncLog aynı DbContext üzerinden kaydedilir.
            await _planRepository.SaveChangesAsync(cancellationToken);
        }
        catch (Exception ex) {
            syncLog.Fail(ex.Message);
            plan.MarkErpFailed();
            await _planRepository.SaveChangesAsync(cancellationToken);
            throw;
        }
    }

    [LoggerMessage(Level = LogLevel.Warning, Message = "ERP aktarımı atlandı: plan bulunamadı. PlanId={PlanId} CompanyId={CompanyId}")]
    private partial void LogPlanNotFound(Guid planId, Guid companyId);

    [LoggerMessage(Level = LogLevel.Error, Message = "ERP aktarımı başarısız: şirkete tanımlı ERP bağlantısı yok. PlanId={PlanId} CompanyId={CompanyId}")]
    private partial void LogNoIntegration(Guid planId, Guid companyId);

    [LoggerMessage(Level = LogLevel.Error, Message = "ERP aktarımı başarısız: {Reason} PlanId={PlanId} IntegrationId={IntegrationId}")]
    private partial void LogExportFailed(string reason, Guid planId, Guid integrationId);
}
