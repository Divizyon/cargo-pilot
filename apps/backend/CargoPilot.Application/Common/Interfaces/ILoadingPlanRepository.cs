using CargoPilot.Application.Common.Models;
using CargoPilot.Application.Features.Plans.GetDashboardStats;
using CargoPilot.Application.Features.Plans.GetLoadingPlanReports;
using CargoPilot.Application.Features.Plans.GetPlanById;
using CargoPilot.Application.Features.Plans.GetPlans;
using CargoPilot.Domain.Entities;
using PlacedItemResult = CargoPilot.Application.Common.Models.PlacedItemResult;
using UnplacedItemResult = CargoPilot.Application.Common.Models.UnplacedItemResult;

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
    Task<IReadOnlyList<Guid>> GetPlanVehicleIdsAsync(Guid planId, CancellationToken cancellationToken = default);
    Task UpdateVehicleOrderAsync(Guid planId, IReadOnlyList<Guid> orderedVehicleIds, CancellationToken cancellationToken = default);
    Task<int> CountByUserAsync(Guid userId, CancellationToken cancellationToken = default);
    Task<int> CountByCompanyAsync(Guid companyId, CancellationToken cancellationToken = default);

    Task<LoadingPlanInputItem?> GetInputItemByIdAsync(Guid inputItemId, Guid planId, CancellationToken cancellationToken = default);

    Task SaveChangesAsync(CancellationToken cancellationToken = default);

    Task SaveWithResultAsync(
        LoadingPlan plan,
        IReadOnlyList<LoadingPlanVehicle> vehicles,
        IReadOnlyList<LoadingPlanInputItem> inputItems,
        IReadOnlyList<(Guid VehicleId, IReadOnlyList<PlacedItemResult> Placements)> vehiclePlacements,
        IReadOnlyList<UnplacedItemResult> finalUnplacedItems,
        CancellationToken cancellationToken = default);

    Task ReOptimizeWithResultAsync(
        LoadingPlan plan,
        IReadOnlyList<LoadingPlanVehicle> newVehicles,
        IReadOnlyList<LoadingPlanInputItem> newInputItems,
        IReadOnlyList<(Guid VehicleId, IReadOnlyList<PlacedItemResult> Placements)> vehiclePlacements,
        IReadOnlyList<UnplacedItemResult> finalUnplacedItems,
        CancellationToken cancellationToken = default);
}
