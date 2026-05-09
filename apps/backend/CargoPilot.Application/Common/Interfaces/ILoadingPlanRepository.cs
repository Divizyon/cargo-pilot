using CargoPilot.Application.Common.Models;
using CargoPilot.Application.Features.Plans.GetLoadingPlanReports;
using CargoPilot.Application.Features.Plans.GetPlanById;
using CargoPilot.Application.Features.Plans.GetPlans;
using CargoPilot.Domain.Entities;

namespace CargoPilot.Application.Common.Interfaces;

public interface ILoadingPlanRepository
{
    Task<PagedResult<PlanSummaryDto>> GetPagedAsync(
        int page,
        int pageSize,
        string sortBy,
        bool descending,
        Guid? companyId,
        string? plateNumber = null,
        IReadOnlyList<Guid>? vehicleIds = null,
        DateOnly? planDateStart = null,
        DateOnly? planDateEnd = null,
        CancellationToken cancellationToken = default);

    Task<PlanDetailDto?> GetDetailByIdAsync(
        Guid id,
        Guid? companyId,
        CancellationToken cancellationToken = default);

    Task<PagedResult<LoadingPlanReportDto>> GetPagedReportsAsync(
        int page,
        int pageSize,
        DateTime? startDate,
        DateTime? endDate,
        Guid? vehicleId,
        decimal? minFillRate,
        decimal? maxFillRate,
        Guid? companyId,
        CancellationToken cancellationToken = default);

    Task<LoadingPlan?> GetByIdAsync(Guid id, Guid? companyId, CancellationToken cancellationToken = default);

    void Add(LoadingPlan plan);

    void AddInputItems(IEnumerable<LoadingPlanInputItem> items);

    Task SaveChangesAsync(CancellationToken cancellationToken = default);
}
