using CargoPilot.Application.Common.Erp;
using CargoPilot.Application.Common.Models;
using CargoPilot.Application.Features.Plans.GetDashboardStats;
using CargoPilot.Application.Features.Plans.GetLoadingPlanReports;
using CargoPilot.Application.Features.Plans.GetPlanById;
using CargoPilot.Application.Features.Plans.GetPlans;
using CargoPilot.Domain.Entities;

namespace CargoPilot.Application.Common.Interfaces;

public interface ILoadingPlanRepository
{
    Task<DashboardStatsDto> GetDashboardStatsAsync(
        Guid? companyId,
        DateTime? startDate,
        DateTime? endDate,
        CancellationToken cancellationToken = default);

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
    Task<int> CountByUserAsync(Guid userId, CancellationToken cancellationToken = default);
    Task<int> CountByCompanyAsync(Guid companyId, CancellationToken cancellationToken = default);

    Task<LoadingPlanInputItem?> GetInputItemByIdAsync(Guid inputItemId, Guid planId, CancellationToken cancellationToken = default);

    /// <summary>
    /// Plandan ERP'ye aktarilacak satirlar: araca yerlesen urunler ve adetleri.
    /// Yerlesemeyen urunler sevk edilmedigi icin siparise girmez.
    /// </summary>
    Task<IReadOnlyList<PlanErpExportLine>> GetErpExportLinesAsync(
        Guid planId,
        CancellationToken cancellationToken = default);

    Task SaveChangesAsync(CancellationToken cancellationToken = default);

    Task SaveDraftAsync(
        LoadingPlan plan,
        IReadOnlyList<LoadingPlanInputItem> inputItems,
        CancellationToken cancellationToken = default);

    Task SaveWithResultAsync(
        LoadingPlan plan,
        IReadOnlyList<LoadingPlanInputItem> inputItems,
        OptimizationResult result,
        CancellationToken cancellationToken = default);

    Task ReOptimizeWithResultAsync(
        LoadingPlan plan,
        IReadOnlyList<LoadingPlanInputItem> newInputItems,
        OptimizationResult result,
        CancellationToken cancellationToken = default);
}
