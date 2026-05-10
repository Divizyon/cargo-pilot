using CargoPilot.Application.Common.Models;
using MediatR;

namespace CargoPilot.Application.Features.Plans.GetLoadingPlanReports;

public sealed record GetLoadingPlanReportsQuery(
    DateTime? StartDate,
    DateTime? EndDate,
    Guid? VehicleId,
    decimal? MinFillRate,
    decimal? MaxFillRate,
    int Page = 1,
    int PageSize = 20) : IRequest<Result<PagedResult<LoadingPlanReportDto>>>;
