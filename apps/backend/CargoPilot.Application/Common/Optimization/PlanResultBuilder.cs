using CargoPilot.Application.Common.Models;

namespace CargoPilot.Application.Common.Optimization;

/// <summary>
/// Yerlesim listesini sonuc sozlesmesine cevirir: doluluk, toplam agirlik, uc
/// eksende agirlik merkezi, denge sapma yuzdeleri ve sebepli yerlesemeyenler.
///
/// Iki yerlestirici (greedy ve Wall-Builder) ayni hesabi kullanir. Ayri ayri
/// yazilsalardi ayni metrigin iki tanimi olurdu; rulebook'un "ayni kural iki kere
/// yazilmaz" ilkesi tam olarak bunu yasakliyor.
/// </summary>
internal static class PlanResultBuilder
{
    internal static OptimizationResult Build(
        List<PlacedBox> placements,
        List<UnplacedBox> unplaced,
        decimal vehicleWidth,
        decimal vehicleHeight,
        decimal vehicleLength,
        SearchStats? searchStats = null,
        IReadOnlyList<WallSegment>? walls = null)
    {
        var totalWeight = placements.Sum(p => p.Weight);

        var vehicleVolume = vehicleWidth * vehicleHeight * vehicleLength;
        var placedVolume = placements.Sum(p => p.Width * p.Height * p.Length);
        var fillRate = vehicleVolume > 0 ? placedVolume / vehicleVolume : 0m;

        var halfW = vehicleWidth / 2m;
        var halfL = vehicleLength / 2m;

        decimal? cogX = null, cogY = null, cogZ = null;
        decimal? balanceOffsetX = null, balanceOffsetZ = null;
        if (totalWeight > 0)
        {
            cogX = placements.Sum(p => p.Weight * (p.X + p.Width / 2)) / totalWeight;
            cogY = placements.Sum(p => p.Weight * (p.Y + p.Height / 2)) / totalWeight;
            cogZ = placements.Sum(p => p.Weight * (p.Z + p.Length / 2)) / totalWeight;

            if (halfW > 0)
                balanceOffsetX = Math.Round(Math.Abs(cogX.Value - halfW) / halfW * 100, 1);
            if (halfL > 0)
                balanceOffsetZ = Math.Round(Math.Abs(cogZ.Value - halfL) / halfL * 100, 1);
        }

        var placedResults = placements
            .Select(p => new PlacedItemResult(Guid.NewGuid(), p.ItemId, p.X, p.Y, p.Z, p.Width, p.Height, p.Length, p.Rotation, p.Weight))
            .ToList();

        var unplacedResults = unplaced
            .GroupBy(u => (u.ItemId, u.Reason))
            .Select(g => new UnplacedItemResult(g.Key.ItemId, g.Count(), g.Key.Reason))
            .ToList();

        return new OptimizationResult(
            placedResults, unplacedResults, totalWeight, fillRate,
            cogX, cogY, cogZ, balanceOffsetX, balanceOffsetZ, searchStats, walls);
    }
}
