using CargoPilot.Application.Abstractions;
using CargoPilot.Application.Common.Interfaces;
using CargoPilot.Application.Common.Models;
using MediatR;

namespace CargoPilot.Application.Features.Plans.GetDashboardStats;

public sealed class GetDashboardStatsQueryHandler : IRequestHandler<GetDashboardStatsQuery, Result<DashboardStatsDto>>
{
    private readonly ILoadingPlanRepository _repository;
    private readonly ICurrentUserService _currentUserService;

    public GetDashboardStatsQueryHandler(
        ILoadingPlanRepository repository,
        ICurrentUserService currentUserService)
    {
        _repository = repository;
        _currentUserService = currentUserService;
    }

    public async Task<Result<DashboardStatsDto>> Handle(
        GetDashboardStatsQuery request,
        CancellationToken cancellationToken)
    {
        var now = DateTime.UtcNow;
        var daysSinceMonday = ((int)now.DayOfWeek + 6) % 7;
        var weekStart = now.Date.AddDays(-daysSinceMonday);

        var startDate = request.StartDate ?? weekStart;
        var endDate = request.EndDate ?? now;

        var stats = await _repository.GetDashboardStatsAsync(
            _currentUserService.CompanyId,
            startDate,
            endDate,
            cancellationToken);

        return Result<DashboardStatsDto>.Success(stats);
    }
}
