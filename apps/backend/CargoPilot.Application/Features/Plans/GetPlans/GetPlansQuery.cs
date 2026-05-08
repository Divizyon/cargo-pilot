using CargoPilot.Application.Common.Models;
using MediatR;

namespace CargoPilot.Application.Features.Plans.GetPlans;

public sealed record GetPlansQuery(
    int Page = 1,
    int PageSize = 20,
    string SortBy = "createdAt",
    string SortDirection = "desc",
    string? PlateNumber = null,
    IReadOnlyList<Guid>? VehicleIds = null,
    DateOnly? PlanDateStart = null,
    DateOnly? PlanDateEnd = null) : IRequest<Result<PagedResult<PlanSummaryDto>>>;
