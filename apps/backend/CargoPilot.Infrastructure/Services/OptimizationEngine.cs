using CargoPilot.Application.Common.Interfaces;
using CargoPilot.Application.Common.Models;
using CargoPilot.Domain.Enums;

namespace CargoPilot.Infrastructure.Services;

internal sealed class OptimizationEngine : IOptimizationEngine
{
    public OptimizationResult Run(OptimizationInput input)
    {
        var placements = new List<PlacedBox>();
        var unplaced = new List<UnplacedBox>();
        var totalWeight = 0m;

        var instances = input.Items
            .SelectMany(i => Enumerable.Range(0, i.Quantity).Select(_ => i))
            .OrderByDescending(i => i.Width * i.Height * i.Length)
            .ToList();

        var extremePoints = new HashSet<(decimal x, decimal y, decimal z)> { (0m, 0m, 0m) };

        foreach (var item in instances)
        {
            if (totalWeight + item.Weight > input.VehicleMaxWeight)
            {
                unplaced.Add(new UnplacedBox(item.ItemId, UnplacedReason.WeightLimitExceeded));
                continue;
            }

            PlacedBox? best = null;
            var bestScore = decimal.MaxValue;

            foreach (var (ex, ey, ez) in extremePoints)
            {
                foreach (var (w, h, d, rotation) in GetOrientations(item))
                {
                    if (ex + w > input.VehicleWidth)  continue;
                    if (ey + h > input.VehicleHeight) continue;
                    if (ez + d > input.VehicleLength) continue;

                    if (HasOverlap(placements, ex, ey, ez, w, h, d)) continue;
                    if (!HasSupport(placements, ex, ey, ez, w, d))   continue;
                    if (ViolatesStackability(placements, ex, ey, ez, w, d)) continue;

                    var score = ey * 1_000_000m + ez * 1_000m + ex;
                    if (score < bestScore)
                    {
                        bestScore = score;
                        best = new PlacedBox(item.ItemId, ex, ey, ez, w, h, d, rotation, item.Weight, item.IsStackable);
                    }
                }
            }

            if (best is null)
            {
                unplaced.Add(new UnplacedBox(item.ItemId, UnplacedReason.InsufficientSpace));
                continue;
            }

            placements.Add(best);
            totalWeight += best.Weight;

            extremePoints.Add((best.X + best.W, best.Y, best.Z));
            extremePoints.Add((best.X, best.Y + best.H, best.Z));
            extremePoints.Add((best.X, best.Y, best.Z + best.D));

            extremePoints.RemoveWhere(p =>
                p.x >= input.VehicleWidth  ||
                p.y >= input.VehicleHeight ||
                p.z >= input.VehicleLength);
        }

        var vehicleVolume = input.VehicleWidth * input.VehicleHeight * input.VehicleLength;
        var placedVolume = placements.Sum(p => p.W * p.H * p.D);
        var fillRate = vehicleVolume > 0 ? placedVolume / vehicleVolume : 0m;

        decimal? cogX = null, cogY = null, cogZ = null;
        decimal? balanceOffsetX = null, balanceOffsetZ = null;
        if (totalWeight > 0)
        {
            cogX = placements.Sum(p => p.Weight * (p.X + p.W / 2)) / totalWeight;
            cogY = placements.Sum(p => p.Weight * (p.Y + p.H / 2)) / totalWeight;
            cogZ = placements.Sum(p => p.Weight * (p.Z + p.D / 2)) / totalWeight;

            var halfW = input.VehicleWidth  / 2;
            var halfL = input.VehicleLength / 2;
            if (halfW > 0)
                balanceOffsetX = Math.Round(Math.Abs(cogX.Value - halfW) / halfW * 100, 1);
            if (halfL > 0)
                balanceOffsetZ = Math.Round(Math.Abs(cogZ.Value - halfL) / halfL * 100, 1);
        }

        var placedResults = placements
            .Select(p => new PlacedItemResult(Guid.NewGuid(), p.ItemId, p.X, p.Y, p.Z, p.W, p.H, p.D, p.Rotation, p.Weight))
            .ToList();

        var unplacedResults = unplaced
            .GroupBy(u => (u.ItemId, u.Reason))
            .Select(g => new UnplacedItemResult(g.Key.ItemId, g.Count(), g.Key.Reason))
            .ToList();

        return new OptimizationResult(placedResults, unplacedResults, totalWeight, fillRate, cogX, cogY, cogZ, balanceOffsetX, balanceOffsetZ);
    }

    private static (decimal w, decimal h, decimal d, LoadingPlanPlacementRotation rotation)[]
        GetOrientations(OptimizationItemInput item)
    {
        var (W, H, L) = (item.Width, item.Height, item.Length);

        return item.AllowedRotations switch
        {
            AllowedRotations.Fixed =>
            [
                (W, H, L, LoadingPlanPlacementRotation.NoRotation)
            ],
            AllowedRotations.NoVertical =>
            [
                (W, H, L, LoadingPlanPlacementRotation.NoRotation),
                (L, H, W, LoadingPlanPlacementRotation.Yaw)
            ],
            _ =>
            [
                (W, H, L, LoadingPlanPlacementRotation.NoRotation),
                (L, H, W, LoadingPlanPlacementRotation.Yaw),
                (H, W, L, LoadingPlanPlacementRotation.Roll),
                (W, L, H, LoadingPlanPlacementRotation.Pitch),
                (H, L, W, LoadingPlanPlacementRotation.YawPitch),
                (L, W, H, LoadingPlanPlacementRotation.RollYaw)
            ]
        };
    }

    private static bool HasOverlap(
        List<PlacedBox> placed,
        decimal x, decimal y, decimal z,
        decimal w, decimal h, decimal d)
    {
        foreach (var b in placed)
        {
            if (x < b.X + b.W && x + w > b.X &&
                y < b.Y + b.H && y + h > b.Y &&
                z < b.Z + b.D && z + d > b.Z)
                return true;
        }
        return false;
    }

    private static bool HasSupport(
        List<PlacedBox> placed,
        decimal x, decimal y, decimal z,
        decimal w, decimal d)
    {
        if (y == 0m) return true;

        var footprint = w * d;
        if (footprint == 0m) return true;

        var supportedArea = 0m;
        foreach (var b in placed)
        {
            if (b.Y + b.H != y) continue;
            var overlapX = Math.Max(0m, Math.Min(x + w, b.X + b.W) - Math.Max(x, b.X));
            var overlapZ = Math.Max(0m, Math.Min(z + d, b.Z + b.D) - Math.Max(z, b.Z));
            supportedArea += overlapX * overlapZ;
        }

        return supportedArea / footprint >= 0.80m;
    }

    private static bool ViolatesStackability(
        List<PlacedBox> placed,
        decimal x, decimal y, decimal z,
        decimal w, decimal d)
    {
        foreach (var b in placed)
        {
            if (b.IsStackable) continue;
            if (b.Y + b.H != y) continue;
            var overlapX = Math.Max(0m, Math.Min(x + w, b.X + b.W) - Math.Max(x, b.X));
            var overlapZ = Math.Max(0m, Math.Min(z + d, b.Z + b.D) - Math.Max(z, b.Z));
            if (overlapX > 0m && overlapZ > 0m) return true;
        }
        return false;
    }

    private sealed record PlacedBox(
        Guid ItemId,
        decimal X, decimal Y, decimal Z,
        decimal W, decimal H, decimal D,
        LoadingPlanPlacementRotation Rotation,
        decimal Weight,
        bool IsStackable);

    private sealed record UnplacedBox(Guid ItemId, UnplacedReason Reason);
}
