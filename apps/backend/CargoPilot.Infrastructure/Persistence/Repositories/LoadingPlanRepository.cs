using CargoPilot.Application.Common.Interfaces;
using CargoPilot.Application.Common.Models;
using CargoPilot.Application.Features.Plans.GetDashboardStats;
using CargoPilot.Application.Features.Plans.GetLoadingPlanReports;
using CargoPilot.Application.Features.Plans.GetPlanById;
using CargoPilot.Application.Features.Plans.GetPlans;
using CargoPilot.Domain.Entities;
using CargoPilot.Domain.Enums;
using Microsoft.EntityFrameworkCore;

namespace CargoPilot.Infrastructure.Persistence.Repositories;

internal sealed class LoadingPlanRepository : ILoadingPlanRepository
{
    private readonly AppDbContext _context;

    public LoadingPlanRepository(AppDbContext context)
    {
        _context = context;
    }

    public async Task<DashboardStatsDto> GetDashboardStatsAsync(
        Guid? companyId,
        DateTime? startDate,
        DateTime? endDate,
        CancellationToken cancellationToken = default)
    {
        var query = _context.LoadingPlans
            .AsNoTracking()
            .Where(p => p.CompanyId == companyId
                     && p.OptimizationStatus == LoadingPlanOptimizationStatus.Calculated);

        if (startDate.HasValue)
            query = query.Where(p => p.CreatedAtUtc >= startDate.Value);

        if (endDate.HasValue)
            query = query.Where(p => p.CreatedAtUtc <= endDate.Value);

        var stats = await query
            .GroupBy(_ => 1)
            .Select(g => new
            {
                Count = g.Count(),
                TotalWeight = g.Sum(p => p.TotalWeight),
                AvgFillRate = g.Average(p => p.FillRate)
            })
            .FirstOrDefaultAsync(cancellationToken);

        if (stats is null)
            return new DashboardStatsDto(0m, 0m, 0);

        return new DashboardStatsDto(
            Math.Round(stats.AvgFillRate * 100m, 1),
            Math.Round(stats.TotalWeight / 1000m, 2),
            stats.Count);
    }

    public async Task<PagedResult<PlanSummaryDto>> GetPagedAsync(
        int page,
        int pageSize,
        string sortBy,
        bool descending,
        Guid? companyId,
        string? plateNumber = null,
        IReadOnlyList<Guid>? vehicleIds = null,
        DateOnly? planDateStart = null,
        DateOnly? planDateEnd = null,
        CancellationToken cancellationToken = default)
    {
        var query = _context.LoadingPlans.AsNoTracking()
            .Where(p => p.CompanyId == companyId);

        if (!string.IsNullOrWhiteSpace(plateNumber))
            query = query.Where(p => p.Vehicle.PlateNumber != null && p.Vehicle.PlateNumber.Contains(plateNumber));

        if (vehicleIds is { Count: > 0 })
            query = query.Where(p => vehicleIds.Contains(p.VehicleId));

        if (planDateStart.HasValue)
        {
            var start = planDateStart.Value.ToDateTime(TimeOnly.MinValue, DateTimeKind.Utc);
            query = query.Where(p => p.CreatedAtUtc >= start);
        }

        if (planDateEnd.HasValue)
        {
            var end = planDateEnd.Value.ToDateTime(TimeOnly.MaxValue, DateTimeKind.Utc);
            query = query.Where(p => p.CreatedAtUtc <= end);
        }

        var totalCount = await query.CountAsync(cancellationToken);

        IQueryable<LoadingPlan> ordered = (sortBy.ToLowerInvariant(), descending) switch
        {
            ("planname", true)  => query.OrderByDescending(p => p.PlanName),
            ("planname", false) => query.OrderBy(p => p.PlanName),
            ("fillrate", true)  => query.OrderByDescending(p => p.FillRate),
            ("fillrate", false) => query.OrderBy(p => p.FillRate),
            ("optimizationstatus", true)  => query.OrderByDescending(p => p.OptimizationStatus),
            ("optimizationstatus", false) => query.OrderBy(p => p.OptimizationStatus),
            (_, true)  => query.OrderByDescending(p => p.CreatedAtUtc),
            (_, false) => query.OrderBy(p => p.CreatedAtUtc),
        };

        var items = await ordered
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(p => new PlanSummaryDto(
                p.Id,
                p.PlanName,
                p.OptimizationStatus,
                p.OptimizationCriteria,
                p.TotalWeight,
                p.FillRate,
                p.InputTotalQuantity,
                p.PlacedQuantity,
                p.UnplacedQuantity,
                p.VehicleId,
                p.Vehicle.VehicleName,
                p.CreatedAtUtc,
                p.ThumbnailUrl))
            .ToListAsync(cancellationToken);

        return new PagedResult<PlanSummaryDto>(items, totalCount, page, pageSize);
    }

    public async Task<PagedResult<LoadingPlanReportDto>> GetPagedReportsAsync(
        int page,
        int pageSize,
        DateTime? startDate,
        DateTime? endDate,
        Guid? vehicleId,
        decimal? minFillRate,
        decimal? maxFillRate,
        Guid? companyId,
        CancellationToken cancellationToken = default)
    {
        var query = _context.LoadingPlans
            .AsNoTracking()
            .Where(p => p.CompanyId == companyId)
            .AsQueryable();

        if (startDate.HasValue)
            query = query.Where(p => p.CreatedAtUtc >= startDate.Value);

        if (endDate.HasValue)
            query = query.Where(p => p.CreatedAtUtc <= endDate.Value);

        if (vehicleId.HasValue)
            query = query.Where(p => p.VehicleId == vehicleId.Value);

        if (minFillRate.HasValue)
            query = query.Where(p => p.FillRate >= minFillRate.Value);

        if (maxFillRate.HasValue)
            query = query.Where(p => p.FillRate <= maxFillRate.Value);

        var totalCount = await query.CountAsync(cancellationToken);

        var items = await query
            .OrderByDescending(p => p.CreatedAtUtc)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(p => new LoadingPlanReportDto(
                p.Id,
                p.PlanName,
                p.CreatedAtUtc,
                p.Vehicle.PlateNumber,
                p.FillRate,
                p.OptimizationStatus,
                p.ReportId,
                p.ReportUrl))
            .ToListAsync(cancellationToken);

        return new PagedResult<LoadingPlanReportDto>(items, totalCount, page, pageSize);
    }

    public async Task<PlanDetailDto?> GetDetailByIdAsync(
        Guid id,
        Guid? companyId,
        CancellationToken cancellationToken = default)
    {
        var plan = await _context.LoadingPlans
            .AsNoTracking()
            .Include(p => p.Vehicle)
            .FirstOrDefaultAsync(p => p.Id == id && p.CompanyId == companyId, cancellationToken);

        if (plan is null) return null;

        var placements = await _context.LoadingPlanPlacements
            .AsNoTracking()
            .Include(p => p.Item)
            .Where(p => p.LoadingPlanId == id)
            .ToListAsync(cancellationToken);

        var unplacedItems = await _context.LoadingPlanUnplacedItems
            .AsNoTracking()
            .Include(u => u.Item)
            .Where(u => u.LoadingPlanId == id)
            .ToListAsync(cancellationToken);

        var warnings = await _context.LoadingPlanWarnings
            .AsNoTracking()
            .Include(w => w.RelatedItem)
            .Include(w => w.RelatedPlacement)
            .Where(w => w.LoadingPlanId == id)
            .ToListAsync(cancellationToken);

        var inputItems = await _context.LoadingPlanInputItems
            .AsNoTracking()
            .Include(i => i.Item)
            .Where(i => i.LoadingPlanId == id)
            .ToListAsync(cancellationToken);

        var groups = await _context.LoadingPlanItemGroups
            .AsNoTracking()
            .Where(g => g.LoadingPlanId == id)
            .ToListAsync(cancellationToken);

        return MapToDetailDto(plan, placements, unplacedItems, warnings, inputItems, groups);
    }

    private static PlanDetailDto MapToDetailDto(
        LoadingPlan plan,
        List<LoadingPlanPlacement> placements,
        List<LoadingPlanUnplacedItem> unplacedItems,
        List<LoadingPlanWarning> warnings,
        List<LoadingPlanInputItem> inputItems,
        List<LoadingPlanItemGroup> groups)
    {
        var vehicleDto = new VehicleInPlanDto(
            plan.Vehicle.Id,
            plan.Vehicle.VehicleName,
            plan.Vehicle.PlateNumber,
            plan.Vehicle.VehicleType,
            plan.Vehicle.InternalWidth,
            plan.Vehicle.InternalHeight,
            plan.Vehicle.InternalLength,
            plan.Vehicle.MaxWeightCapacity);

        var placementDtos = placements
            .Select(p => new PlacementDto(
                p.Id,
                p.ItemId,
                p.PositionX,
                p.PositionY,
                p.PositionZ,
                p.Rotation,
                ToItemInPlanDto(p.Item)))
            .ToList();

        var unplacedItemDtos = unplacedItems
            .Select(u => new UnplacedItemDto(
                u.Id,
                u.ItemId,
                u.Quantity,
                u.Reason,
                ToItemInPlanDto(u.Item)))
            .ToList();

        var warningDtos = warnings
            .Select(w => new WarningDto(
                w.Id,
                w.Code,
                w.Message,
                w.RelatedItemId,
                w.RelatedPlacementId))
            .ToList();

        var inputItemDtos = inputItems
            .Select(i => new InputItemDto(
                i.Id,
                i.ItemId,
                i.Quantity,
                ToItemInPlanDto(i.Item),
                i.GroupId))
            .ToList();

        var inputItemsByGroup = inputItemDtos
            .Where(i => i.GroupId.HasValue)
            .GroupBy(i => i.GroupId!.Value)
            .ToDictionary(g => g.Key, g => (IReadOnlyList<InputItemDto>)g.ToList());

        var groupDtos = groups
            .Select(g => new PlanGroupDto(
                g.Id,
                g.Name,
                g.Color,
                g.UnloadingOrder,
                g.IsActive,
                inputItemsByGroup.TryGetValue(g.Id, out var gItems) ? gItems : []))
            .ToList();

        return new PlanDetailDto(
            plan.Id,
            plan.PlanName,
            plan.OptimizationStatus,
            plan.OptimizationCriteria,
            plan.ErrorCode,
            plan.ErrorMessage,
            plan.TotalWeight,
            plan.FillRate,
            plan.InputTotalQuantity,
            plan.PlacedQuantity,
            plan.UnplacedQuantity,
            plan.CenterOfGravityX,
            plan.CenterOfGravityY,
            plan.CenterOfGravityZ,
            CalcBalanceOffset(plan.CenterOfGravityX, plan.Vehicle.InternalWidth),
            CalcBalanceOffset(plan.CenterOfGravityZ, plan.Vehicle.InternalLength),
            plan.CreatedAtUtc,
            plan.ErpExportStatus,
            plan.ThumbnailUrl,
            vehicleDto,
            placementDtos,
            unplacedItemDtos,
            warningDtos,
            inputItemDtos,
            groupDtos);
    }

    public async Task<LoadingPlan?> GetByIdAsync(Guid id, Guid? companyId, CancellationToken cancellationToken = default)
        => await _context.LoadingPlans
            .FirstOrDefaultAsync(p => p.Id == id && p.CompanyId == companyId, cancellationToken);

    public Task<int> CountByUserAsync(Guid userId, CancellationToken cancellationToken = default)
        => _context.LoadingPlans.CountAsync(p => p.CreatedBy == userId, cancellationToken);

    public Task<int> CountByCompanyAsync(Guid companyId, CancellationToken cancellationToken = default)
        => _context.LoadingPlans.CountAsync(p => p.CompanyId == companyId, cancellationToken);

    public async Task<LoadingPlanInputItem?> GetInputItemByIdAsync(Guid inputItemId, Guid planId, CancellationToken cancellationToken = default)
        => await _context.LoadingPlanInputItems
            .FirstOrDefaultAsync(i => i.Id == inputItemId && i.LoadingPlanId == planId, cancellationToken);

    public Task SaveChangesAsync(CancellationToken cancellationToken = default)
        => _context.SaveChangesAsync(cancellationToken);

    public async Task SaveDraftAsync(
        LoadingPlan plan,
        IReadOnlyList<LoadingPlanInputItem> inputItems,
        CancellationToken cancellationToken = default)
    {
        _context.LoadingPlans.Add(plan);
        _context.LoadingPlanInputItems.AddRange(inputItems);
        await _context.SaveChangesAsync(cancellationToken);
    }

    public async Task SaveWithResultAsync(
        LoadingPlan plan,
        IReadOnlyList<LoadingPlanInputItem> inputItems,
        OptimizationResult result,
        CancellationToken cancellationToken = default)
    {
        var placements = result.Placements
            .Select(p => new LoadingPlanPlacement(p.PlacementId, plan.Id, p.ItemId, p.X, p.Y, p.Z, p.Rotation))
            .ToList();

        var unplacedItems = result.UnplacedItems
            .Select(u => new LoadingPlanUnplacedItem(Guid.NewGuid(), plan.Id, u.ItemId, u.Quantity, u.Reason))
            .ToList();

        plan.ApplyOptimizationResult(
            LoadingPlanOptimizationStatus.Calculated,
            result.TotalWeight,
            result.FillRate,
            result.Placements.Count,
            result.UnplacedItems.Sum(u => u.Quantity),
            result.CenterOfGravityX,
            result.CenterOfGravityY,
            result.CenterOfGravityZ);

        _context.LoadingPlans.Add(plan);
        _context.LoadingPlanInputItems.AddRange(inputItems);
        _context.LoadingPlanPlacements.AddRange(placements);
        _context.LoadingPlanUnplacedItems.AddRange(unplacedItems);

        await _context.SaveChangesAsync(cancellationToken);
    }

    public async Task ReOptimizeWithResultAsync(
        LoadingPlan plan,
        IReadOnlyList<LoadingPlanInputItem> newInputItems,
        OptimizationResult result,
        CancellationToken cancellationToken = default)
    {
        var oldInputItems = await _context.LoadingPlanInputItems
            .Where(i => i.LoadingPlanId == plan.Id)
            .ToListAsync(cancellationToken);
        foreach (var i in oldInputItems) i.MarkAsDeleted();

        var oldPlacements = await _context.LoadingPlanPlacements
            .Where(p => p.LoadingPlanId == plan.Id)
            .ToListAsync(cancellationToken);
        foreach (var p in oldPlacements) p.MarkAsDeleted();

        var oldUnplacedItems = await _context.LoadingPlanUnplacedItems
            .Where(u => u.LoadingPlanId == plan.Id)
            .ToListAsync(cancellationToken);
        foreach (var u in oldUnplacedItems) u.MarkAsDeleted();

        var oldWarnings = await _context.LoadingPlanWarnings
            .Where(w => w.LoadingPlanId == plan.Id)
            .ToListAsync(cancellationToken);
        foreach (var w in oldWarnings) w.MarkAsDeleted();

        var newPlacements = result.Placements
            .Select(p => new LoadingPlanPlacement(p.PlacementId, plan.Id, p.ItemId, p.X, p.Y, p.Z, p.Rotation))
            .ToList();

        var newUnplacedItems = result.UnplacedItems
            .Select(u => new LoadingPlanUnplacedItem(Guid.NewGuid(), plan.Id, u.ItemId, u.Quantity, u.Reason))
            .ToList();

        plan.ApplyOptimizationResult(
            LoadingPlanOptimizationStatus.Calculated,
            result.TotalWeight,
            result.FillRate,
            result.Placements.Count,
            result.UnplacedItems.Sum(u => u.Quantity),
            result.CenterOfGravityX,
            result.CenterOfGravityY,
            result.CenterOfGravityZ);

        _context.LoadingPlanInputItems.AddRange(newInputItems);
        _context.LoadingPlanPlacements.AddRange(newPlacements);
        _context.LoadingPlanUnplacedItems.AddRange(newUnplacedItems);

        await _context.SaveChangesAsync(cancellationToken);
    }

    private static ItemInPlanDto ToItemInPlanDto(Item item) =>
        new(item.Id, item.SKU, item.Name, item.Width, item.Height, item.Length, item.Weight, item.ImageUrl, item.ProductType);

    private static decimal? CalcBalanceOffset(decimal? cog, decimal dimension)
    {
        if (!cog.HasValue || dimension <= 0) return null;
        var half = dimension / 2;
        return Math.Round(Math.Abs(cog.Value - half) / half * 100, 1);
    }
}
