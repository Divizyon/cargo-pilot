using CargoPilot.Application.Abstractions;
using CargoPilot.Application.Common.Interfaces;
using CargoPilot.Application.Common.Models;
using MediatR;

namespace CargoPilot.Application.Features.Plans.UpdatePlanName;

public sealed class UpdatePlanNameCommandHandler : IRequestHandler<UpdatePlanNameCommand, Result<Guid>>
{
    private readonly ILoadingPlanRepository _planRepository;
    private readonly ICurrentUserService _currentUserService;

    public UpdatePlanNameCommandHandler(
        ILoadingPlanRepository planRepository,
        ICurrentUserService currentUserService)
    {
        _planRepository = planRepository;
        _currentUserService = currentUserService;
    }

    public async Task<Result<Guid>> Handle(UpdatePlanNameCommand request, CancellationToken cancellationToken)
    {
        var plan = await _planRepository.GetByIdAsync(request.Id, _currentUserService.CompanyId, cancellationToken);
        if (plan is null)
            return Result<Guid>.Failure(
                new Error(ErrorType.NotFound, "Plan.NotFound", "Yükleme planı bulunamadı."));

        plan.UpdatePlanName(request.PlanName);
        await _planRepository.SaveChangesAsync(cancellationToken);

        return Result<Guid>.Success(plan.Id);
    }
}
