using CargoPilot.Application.Common.Interfaces;
using CargoPilot.Application.Features.Shares.CreateShareLink;
using CargoPilot.Application.Features.Shares.GetSharePlanByToken;
using CargoPilot.Domain.Entities;
using CargoPilot.Domain.Enums;
using Microsoft.EntityFrameworkCore;

namespace CargoPilot.Infrastructure.Persistence.Repositories;

internal sealed class ShareLinkRepository : IShareLinkRepository
{
    private readonly AppDbContext _context;

    public ShareLinkRepository(AppDbContext context)
    {
        _context = context;
    }

    public async Task<ShareLink?> GetByTokenAsync(string token, CancellationToken cancellationToken = default)
        => await _context.ShareLinks
            .FirstOrDefaultAsync(sl => sl.Token == token, cancellationToken);

    public async Task<SharePlanDto?> GetSharePlanByTokenAsync(string token, CancellationToken cancellationToken = default)
    {
        var shareLink = await _context.ShareLinks
            .AsNoTracking()
            .Include(sl => sl.Plan)
                .ThenInclude(p => p.Vehicle)
            .FirstOrDefaultAsync(sl => sl.Token == token, cancellationToken);

        if (shareLink is null) return null;

        var plan = shareLink.Plan;
        var vehicle = plan.Vehicle;

        var placements = await _context.LoadingPlanPlacements
            .AsNoTracking()
            .Include(p => p.Item)
            .Where(p => p.LoadingPlanId == plan.Id)
            .ToListAsync(cancellationToken);

        var inputItems = await _context.LoadingPlanInputItems
            .AsNoTracking()
            .Include(i => i.Group)
            .Where(i => i.LoadingPlanId == plan.Id)
            .ToListAsync(cancellationToken);

        var colorByItemId = inputItems
            .Where(i => i.GroupId.HasValue && i.Group is not null)
            .GroupBy(i => i.ItemId)
            .ToDictionary(g => g.Key, g => g.First().Group!.Color);

        var placementDtos = placements
            .Select(p =>
            {
                var (w, h, d) = ApplyRotation(p.Item.Width, p.Item.Height, p.Item.Length, p.Rotation);
                colorByItemId.TryGetValue(p.ItemId, out var color);
                return new SharePlacementDetailDto(
                    p.ItemId,
                    p.PositionX,
                    p.PositionY,
                    p.PositionZ,
                    w,
                    h,
                    d,
                    (int)p.Rotation,
                    1,
                    false,
                    color,
                    p.Item.Weight,
                    p.Item.Name,
                    p.Item.SKU,
                    p.Item.ProductType);
            })
            .ToList();

        var vehicleData = new ShareVehicleDataDto(
            vehicle.InternalWidth,
            vehicle.InternalHeight,
            vehicle.InternalLength,
            MapDoorDirection(vehicle.LoadingType),
            MapVehicleType(vehicle.VehicleType));

        return new SharePlanDto(
            plan.PlanName,
            $"#{plan.Id.ToString("N")[..8].ToUpperInvariant()}",
            vehicle.VehicleName,
            vehicle.PlateNumber,
            plan.CreatedAtUtc,
            null,
            MapStatus(plan.OptimizationStatus),
            plan.PlacedQuantity,
            plan.TotalWeight,
            vehicle.MaxWeightCapacity,
            plan.FillRate,
            shareLink.IsExpired,
            placementDtos.Count > 0 ? vehicleData : null,
            placementDtos.Count > 0 ? placementDtos : null);
    }

    public async Task<ShareLinkDto?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default)
    {
        var sl = await _context.ShareLinks
            .AsNoTracking()
            .Include(s => s.Plan)
            .FirstOrDefaultAsync(s => s.Id == id, cancellationToken);

        if (sl is null) return null;

        return new ShareLinkDto(
            sl.Id,
            sl.PlanId,
            sl.Plan.PlanName,
            sl.Token,
            sl.Validity,
            sl.ExpiresAt,
            sl.CreatedAtUtc,
            sl.IsExpired,
            sl.ViewCount);
    }

    public void Add(ShareLink shareLink) => _context.ShareLinks.Add(shareLink);

    public async Task SaveChangesAsync(CancellationToken cancellationToken = default)
        => await _context.SaveChangesAsync(cancellationToken);

    private static (decimal w, decimal h, decimal d) ApplyRotation(
        decimal width, decimal height, decimal length, LoadingPlanPlacementRotation rotation)
        => rotation switch
        {
            LoadingPlanPlacementRotation.NoRotation => (width,  height,  length),
            LoadingPlanPlacementRotation.Yaw        => (length, height,  width),
            LoadingPlanPlacementRotation.Pitch      => (width,  length,  height),
            LoadingPlanPlacementRotation.Roll       => (height, width,   length),
            LoadingPlanPlacementRotation.YawPitch   => (height, length,  width),
            LoadingPlanPlacementRotation.RollYaw    => (length, width,   height),
            _                                       => (width,  height,  length),
        };

    private static string MapDoorDirection(LoadingType loadingType)
        => loadingType switch
        {
            LoadingType.Rear     => "rear",
            LoadingType.SideRight or LoadingType.SideLeft => "side",
            LoadingType.SideBoth => "rearAndSide",
            LoadingType.Top      => "top",
            _                    => "rear",
        };

    private static string? MapVehicleType(VehicleType vehicleType)
        => vehicleType switch
        {
            VehicleType.Truck     => "Kamyon",
            VehicleType.Container => "Konteyner",
            _                     => "Tir",
        };

    private static string MapStatus(LoadingPlanOptimizationStatus status)
        => status switch
        {
            LoadingPlanOptimizationStatus.Calculated => "tamamlandi",
            LoadingPlanOptimizationStatus.Failed     => "iptal",
            _                                        => "taslak",
        };
}
