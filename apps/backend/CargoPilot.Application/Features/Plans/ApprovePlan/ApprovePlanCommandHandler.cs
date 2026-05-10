using CargoPilot.Application.Abstractions;
using CargoPilot.Application.Common.Interfaces;
using CargoPilot.Application.Common.Models;
using CargoPilot.Domain.Enums;
using MediatR;

namespace CargoPilot.Application.Features.Plans.ApprovePlan;

public sealed class ApprovePlanCommandHandler : IRequestHandler<ApprovePlanCommand, Result<Guid>>
{
    private readonly ILoadingPlanRepository _planRepository;
    private readonly ICurrentUserService _currentUserService;
    private readonly IErpExportJobScheduler _jobScheduler;

    public ApprovePlanCommandHandler(
        ILoadingPlanRepository planRepository,
        ICurrentUserService currentUserService,
        IErpExportJobScheduler jobScheduler)
    {
        _planRepository = planRepository;
        _currentUserService = currentUserService;
        _jobScheduler = jobScheduler;
    }

    public async Task<Result<Guid>> Handle(ApprovePlanCommand request, CancellationToken cancellationToken)
    {
        var companyId = _currentUserService.CompanyId;
        if (companyId is null)
            return Result<Guid>.Failure(
                new Error(ErrorType.Unauthorized, "Auth.NoCompany", "Şirket bağlamı bulunamadı."));

        var plan = await _planRepository.GetByIdAsync(request.PlanId, companyId, cancellationToken);
        if (plan is null)
            return Result<Guid>.Failure(
                new Error(ErrorType.NotFound, "Plan.NotFound", "Yükleme planı bulunamadı."));

        if (plan.OptimizationStatus != LoadingPlanOptimizationStatus.Calculated)
            return Result<Guid>.Failure(
                new Error(ErrorType.BusinessRule, "Plan.NotCalculated", "Sadece hesaplanmış planlar onaylanıp ERP'e aktarılabilir."));

        if (plan.ErpExportStatus == ErpExportStatus.Pending || plan.ErpExportStatus == ErpExportStatus.Sent)
            return Result<Guid>.Failure(
                new Error(ErrorType.BusinessRule, "Plan.AlreadyExported", "Plan zaten ERP'e aktarılmış veya aktarım kuyruğunda."));

        plan.MarkErpPending();
        await _planRepository.SaveChangesAsync(cancellationToken);

        _jobScheduler.Enqueue(plan.Id, companyId.Value);

        return Result<Guid>.Success(plan.Id);
    }
}
