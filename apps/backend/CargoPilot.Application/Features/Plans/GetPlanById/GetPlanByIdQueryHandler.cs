using CargoPilot.Application.Common.Interfaces;
using CargoPilot.Application.Common.Models;
using MediatR;

namespace CargoPilot.Application.Features.Plans.GetPlanById;

public sealed class GetPlanByIdQueryHandler : IRequestHandler<GetPlanByIdQuery, Result<PlanDetailDto>>
{
    private readonly ILoadingPlanRepository _repository;

    public GetPlanByIdQueryHandler(ILoadingPlanRepository repository)
    {
        _repository = repository;
    }

    public async Task<Result<PlanDetailDto>> Handle(
        GetPlanByIdQuery request,
        CancellationToken cancellationToken)
    {
        var detail = await _repository.GetDetailByIdAsync(request.Id, cancellationToken);

        if (detail is null)
            return Result<PlanDetailDto>.Failure(
                new Error(ErrorType.NotFound, "Plan.NotFound", "Yükleme planı bulunamadı."));

        return Result<PlanDetailDto>.Success(detail);
    }
}
