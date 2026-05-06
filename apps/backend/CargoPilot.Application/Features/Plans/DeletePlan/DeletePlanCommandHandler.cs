using CargoPilot.Application.Common.Interfaces;
using CargoPilot.Application.Common.Models;
using MediatR;

namespace CargoPilot.Application.Features.Plans.DeletePlan;

public sealed class DeletePlanCommandHandler : IRequestHandler<DeletePlanCommand, Result<Guid>>
{
    private readonly ILoadingPlanRepository _planRepository;

    public DeletePlanCommandHandler(ILoadingPlanRepository planRepository)
    {
        _planRepository = planRepository;
    }

    public async Task<Result<Guid>> Handle(DeletePlanCommand request, CancellationToken cancellationToken)
    {
        var plan = await _planRepository.GetByIdAsync(request.Id, cancellationToken);
        if (plan is null)
            return Result<Guid>.Failure(
                new Error(ErrorType.NotFound, "Plan.NotFound", "Yükleme planı bulunamadı."));

        plan.MarkAsDeleted();
        await _planRepository.SaveChangesAsync(cancellationToken);

        return Result<Guid>.Success(plan.Id);
    }
}
