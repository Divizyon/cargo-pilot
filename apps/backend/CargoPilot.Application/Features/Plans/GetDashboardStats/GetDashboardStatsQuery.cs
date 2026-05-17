using CargoPilot.Application.Common.Models;
using MediatR;

namespace CargoPilot.Application.Features.Plans.GetDashboardStats;

public sealed record GetDashboardStatsQuery(
    DateTime? StartDate = null,
    DateTime? EndDate = null) : IRequest<Result<DashboardStatsDto>>;
