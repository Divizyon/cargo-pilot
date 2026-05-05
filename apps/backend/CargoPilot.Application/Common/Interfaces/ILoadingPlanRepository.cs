using CargoPilot.Application.Common.Models;
using CargoPilot.Application.Features.Plans.GetPlanById;
using CargoPilot.Application.Features.Plans.GetPlans;

namespace CargoPilot.Application.Common.Interfaces;

public interface ILoadingPlanRepository
{
    Task<PagedResult<PlanSummaryDto>> GetPagedAsync(
        int page,
        int pageSize,
        string sortBy,
        bool descending,
        CancellationToken cancellationToken = default);

    Task<PlanDetailDto?> GetDetailByIdAsync(
        Guid id,
        CancellationToken cancellationToken = default);
}
