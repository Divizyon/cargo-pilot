using CargoPilot.Application.Abstractions;
using CargoPilot.Application.Common.Interfaces;
using CargoPilot.Application.Common.Models;
using MediatR;

namespace CargoPilot.Application.Features.Plans.GetPlanById;

public sealed class GetPlanByIdQueryHandler : IRequestHandler<GetPlanByIdQuery, Result<PlanDetailDto>>
{
    private readonly ILoadingPlanRepository _repository;
    private readonly ICurrentUserService _currentUserService;

    public GetPlanByIdQueryHandler(
        ILoadingPlanRepository repository,
        ICurrentUserService currentUserService)
    {
        _repository = repository;
        _currentUserService = currentUserService;
    }

    public async Task<Result<PlanDetailDto>> Handle(
        GetPlanByIdQuery request,
        CancellationToken cancellationToken)
    {
        var detail = await _repository.GetDetailByIdAsync(request.Id, _currentUserService.CompanyId, cancellationToken);

        if (detail is null)
            return Result<PlanDetailDto>.Failure(
                new Error(ErrorType.NotFound, "Plan.NotFound", "Yükleme planı bulunamadı."));

        return Result<PlanDetailDto>.Success(detail);
    }
}
