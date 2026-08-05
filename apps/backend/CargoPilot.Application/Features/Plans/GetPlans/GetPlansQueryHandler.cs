using CargoPilot.Application.Abstractions;
using CargoPilot.Application.Common.Interfaces;
using CargoPilot.Application.Common.Models;
using MediatR;

namespace CargoPilot.Application.Features.Plans.GetPlans;

public sealed class GetPlansQueryHandler : IRequestHandler<GetPlansQuery, Result<PagedResult<PlanSummaryDto>>>
{
    private readonly ILoadingPlanRepository _repository;
    private readonly ICurrentUserService _currentUserService;

    public GetPlansQueryHandler(
        ILoadingPlanRepository repository,
        ICurrentUserService currentUserService)
    {
        _repository = repository;
        _currentUserService = currentUserService;
    }

    public async Task<Result<PagedResult<PlanSummaryDto>>> Handle(
        GetPlansQuery request,
        CancellationToken cancellationToken)
    {
        var descending = string.Equals(request.SortDirection, "desc", StringComparison.OrdinalIgnoreCase);

        var pagedResult = await _repository.GetPagedAsync(
            request.Page,
            request.PageSize,
            request.SortBy,
            descending,
            _currentUserService.CompanyId,
            request.PlateNumber,
            request.VehicleIds,
            request.PlanDateStart,
            request.PlanDateEnd,
            cancellationToken);

        return Result<PagedResult<PlanSummaryDto>>.Success(pagedResult);
    }
}
