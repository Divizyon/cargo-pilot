using CargoPilot.Application.Common.Erp;
using CargoPilot.Application.Common.Interfaces;
using CargoPilot.Application.Common.Models;
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

        var integration = await ResolveIntegrationAsync(plan, companyId, cancellationToken);
        if (integration is null)
            return;

        var syncLog = new SyncLog(Guid.NewGuid(), integration.Id, plan.Id);
        _integrationRepository.AddSyncLog(syncLog);

        Error? failure;
        try {
            var exportResult = await _erpExportService.ExportAsync(plan, integration, cancellationToken);

            if (exportResult.IsSuccess) {
                syncLog.Complete(exportResult.Data);
                plan.MarkErpSent();
                failure = null;
            }
            else {
                // Aktarım yapılmadıysa başarı kaydı üretilmez.
                failure = exportResult.Error ?? UnknownFailure;
                LogExportFailed(failure.Description, plan.Id, integration.Id);
                syncLog.Fail(failure.Description);
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

        // Hangfire'in AutomaticRetry'i yalnızca exception'da tetiklenir; geçici hatalar
        // durum kaydedildikten sonra exception'a çevrilerek yeniden kuyruğa alınır.
        // Kalıcı hatalar (yapılandırma/iş kuralı) yeniden denenmez.
        if (failure is not null && IsRetryable(failure))
            throw new ErpExportRetryableException(failure.Description);
    }

    /// <summary>
    /// Tek entegrasyon kuralı: aktarımın hedefi belirsiz kalmasın diye şirkette birden
    /// fazla ERP bağlantısı varsa keyfi seçim yapılmaz, aktarım açık nedenle durur.
    /// </summary>
    private async Task<Integration?> ResolveIntegrationAsync(
        LoadingPlan plan,
        Guid companyId,
        CancellationToken cancellationToken)
    {
        var integrations = await _integrationRepository.ListByCompanyAsync(companyId, cancellationToken);

        if (integrations.Count == 1)
            return integrations[0];

        // Senkronizasyon kaydı bir entegrasyona bağlı olduğundan burada kayıt açılamaz.
        // Neden operasyon loglarında görünür, kullanıcıya plan onayı yanıtında bildirilir.
        if (integrations.Count == 0)
            LogNoIntegration(plan.Id, companyId);
        else
            LogAmbiguousIntegration(plan.Id, companyId, integrations.Count);

        plan.MarkErpFailed();
        await _planRepository.SaveChangesAsync(cancellationToken);
        return null;
    }

    /// <summary>Teknik/geçici hatalar yeniden denenir; yapılandırma ve iş kuralı hataları denenmez.</summary>
    private static bool IsRetryable(Error error) => error.Type == ErrorType.Unexpected;

    private static readonly Error UnknownFailure =
        new(ErrorType.Unexpected, "Erp.ExportFailed", "ERP aktarımı başarısız.");

    [LoggerMessage(Level = LogLevel.Warning, Message = "ERP aktarımı atlandı: plan bulunamadı. PlanId={PlanId} CompanyId={CompanyId}")]
    private partial void LogPlanNotFound(Guid planId, Guid companyId);

    [LoggerMessage(Level = LogLevel.Error, Message = "ERP aktarımı başarısız: şirkete tanımlı ERP bağlantısı yok. PlanId={PlanId} CompanyId={CompanyId}")]
    private partial void LogNoIntegration(Guid planId, Guid companyId);

    [LoggerMessage(Level = LogLevel.Error, Message = "ERP aktarımı başarısız: şirkette {IntegrationCount} ERP bağlantısı var, hedef belirlenemedi. PlanId={PlanId} CompanyId={CompanyId}")]
    private partial void LogAmbiguousIntegration(Guid planId, Guid companyId, int integrationCount);

    [LoggerMessage(Level = LogLevel.Error, Message = "ERP aktarımı başarısız: {Reason} PlanId={PlanId} IntegrationId={IntegrationId}")]
    private partial void LogExportFailed(string reason, Guid planId, Guid integrationId);
}
