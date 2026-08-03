using CargoPilot.Application.Common.Interfaces;
using CargoPilot.Domain.Entities;
using Hangfire;

namespace CargoPilot.Infrastructure.Jobs;

[AutomaticRetry(Attempts = 3)]
public sealed class ErpExportJob {
    private readonly ILoadingPlanRepository _planRepository;
    private readonly IIntegrationRepository _integrationRepository;
    private readonly IErpExportService _erpExportService;

    public ErpExportJob(
        ILoadingPlanRepository planRepository,
        IIntegrationRepository integrationRepository,
        IErpExportService erpExportService)
    {
        _planRepository = planRepository;
        _integrationRepository = integrationRepository;
        _erpExportService = erpExportService;
    }

    public async Task ExecuteAsync(Guid loadingPlanId, Guid companyId, CancellationToken cancellationToken = default)
    {
        var plan = await _planRepository.GetByIdAsync(loadingPlanId, companyId, cancellationToken);
        if (plan is null)
        {
            // Plan bulunamadı — silinmiş veya yanlış companyId. Yeniden denemeye gerek yok.
            return;
        }

        // Retry şeffaflığı: önceki deneme Failed bırakmış olabilir; her deneme Pending ile başlar.
        plan.MarkErpPending();

        var integrations = await _integrationRepository.ListByCompanyAsync(companyId, cancellationToken);
        var integration = integrations.Count > 0 ? integrations[0] : null;

        if (integration is null) {
            plan.MarkErpFailed();
            await _planRepository.SaveChangesAsync(cancellationToken);
            return;
        }

        var syncLog = new SyncLog(Guid.NewGuid(), integration.Id, plan.Id);
        _integrationRepository.AddSyncLog(syncLog);

        try {
            await _erpExportService.ExportAsync(plan, integration, cancellationToken);
            syncLog.Complete(syncedRecordCount: 1);
            plan.MarkErpSent();
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
}
