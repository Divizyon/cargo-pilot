using CargoPilot.Application.Abstractions;
using CargoPilot.Application.Common.Interfaces;
using CargoPilot.Application.Common.Models;
using MediatR;

namespace CargoPilot.Application.Features.Plans.GetLoadingPlanReports;

public sealed class GetLoadingPlanReportsQueryHandler
    : IRequestHandler<GetLoadingPlanReportsQuery, Result<PagedResult<LoadingPlanReportDto>>>
{
    private readonly ILoadingPlanRepository _repository;
    private readonly ICurrentUserService _currentUserService;

    public GetLoadingPlanReportsQueryHandler(
        ILoadingPlanRepository repository,
        ICurrentUserService currentUserService)
    {
        _repository = repository;
        _currentUserService = currentUserService;
    }

    public async Task<Result<PagedResult<LoadingPlanReportDto>>> Handle(
        GetLoadingPlanReportsQuery request,
        CancellationToken cancellationToken)
    {
        var pagedResult = await _repository.GetPagedReportsAsync(
            request.Page,
            request.PageSize,
            request.StartDate,
            request.EndDate,
            request.VehicleId,
            request.MinFillRate,
            request.MaxFillRate,
            _currentUserService.CompanyId,
            cancellationToken);

        return Result<PagedResult<LoadingPlanReportDto>>.Success(pagedResult);
    }
}
