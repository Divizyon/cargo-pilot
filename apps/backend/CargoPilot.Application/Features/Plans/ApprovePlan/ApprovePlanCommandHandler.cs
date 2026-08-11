using CargoPilot.Application.Abstractions;
using CargoPilot.Application.Common.Interfaces;
using CargoPilot.Application.Common.Models;
using CargoPilot.Application.Common.Settings;
using CargoPilot.Domain.Enums;
using MediatR;
using Microsoft.Extensions.Options;

namespace CargoPilot.Application.Features.Plans.ApprovePlan;

internal sealed class ApprovePlanCommandHandler : IRequestHandler<ApprovePlanCommand, Result<ApprovePlanResult>>
{
    private readonly ILoadingPlanRepository _planRepository;
    private readonly ICurrentUserService _currentUserService;
    private readonly IIntegrationRepository _integrationRepository;
    private readonly IErpExportJobScheduler _jobScheduler;
    private readonly ErpExportSettings _erpExportSettings;

    public ApprovePlanCommandHandler(
        ILoadingPlanRepository planRepository,
        ICurrentUserService currentUserService,
        IIntegrationRepository integrationRepository,
        IErpExportJobScheduler jobScheduler,
        IOptions<ErpExportSettings> erpExportSettings)
    {
        _planRepository = planRepository;
        _currentUserService = currentUserService;
        _integrationRepository = integrationRepository;
        _jobScheduler = jobScheduler;
        _erpExportSettings = erpExportSettings.Value;
    }

    public async Task<Result<ApprovePlanResult>> Handle(ApprovePlanCommand request, CancellationToken cancellationToken)
    {
        var companyId = _currentUserService.CompanyId;
        if (companyId is null)
            return Result<ApprovePlanResult>.Failure(
                new Error(ErrorType.Unauthorized, "Auth.NoCompany", "Şirket bağlamı bulunamadı."));

        var plan = await _planRepository.GetByIdAsync(request.PlanId, companyId, cancellationToken);
        if (plan is null)
            return Result<ApprovePlanResult>.Failure(
                new Error(ErrorType.NotFound, "Plan.NotFound", "Yükleme planı bulunamadı."));

        if (plan.OptimizationStatus != LoadingPlanOptimizationStatus.Calculated)
            return Result<ApprovePlanResult>.Failure(
                new Error(ErrorType.BusinessRule, "Plan.NotCalculated", "Sadece hesaplanmış planlar onaylanıp ERP'e aktarılabilir."));

        if (plan.ErpExportStatus == ErpExportStatus.Pending || plan.ErpExportStatus == ErpExportStatus.Sent)
            return Result<ApprovePlanResult>.Failure(
                new Error(ErrorType.BusinessRule, "Plan.AlreadyExported", "Plan zaten ERP'e aktarılmış veya aktarım kuyruğunda."));

        // Ozellik anahtari kapaliyken plan onayi ERP durumuna hic dokunmaz, cunku
        // aktarim henuz gerceklenmedi ve her onaylanan plan basarisiz isaretlenirdi.
        if (!_erpExportSettings.ExportEnabled)
            return Result<ApprovePlanResult>.Success(
                new ApprovePlanResult(plan.Id, ErpExportQueued: false),
                "Plan onaylandı. ERP aktarımı şu an kapalı olduğu için aktarım yapılmadı.");

        // Cari kodu olmadan siparis yazilamaz; job kesin basarisiz olacagi icin nedeni
        // kullaniciya onay aninda soyluyoruz.
        if (string.IsNullOrWhiteSpace(_erpExportSettings.CustomerCode))
            return Result<ApprovePlanResult>.Failure(
                new Error(ErrorType.BusinessRule, "Erp.ExportNotConfigured", "ERP aktarımı için cari kodu tanımlanmadığından plan aktarılamaz. Sunucu ERP aktarım ayarlarını tamamlayın."));

        // Entegrasyon yoksa arka planda sessizce Failed'e dusmek yerine nedeni burada bildiriyoruz.
        var hasIntegration = await _integrationRepository.ExistsByCompanyAsync(companyId.Value, cancellationToken);
        if (!hasIntegration)
            return Result<ApprovePlanResult>.Failure(
                new Error(ErrorType.BusinessRule, "Erp.NoIntegration", "Tanımlı bir ERP bağlantısı bulunmadığı için plan ERP'e aktarılamaz. Önce ayarlardan ERP bağlantısını kaydedin."));

        plan.MarkErpPending();
        await _planRepository.SaveChangesAsync(cancellationToken);

        _jobScheduler.Enqueue(plan.Id, companyId.Value);

        return Result<ApprovePlanResult>.Success(
            new ApprovePlanResult(plan.Id, ErpExportQueued: true),
            "Plan onaylandı, ERP aktarımı kuyruğa alındı.");
    }
}
