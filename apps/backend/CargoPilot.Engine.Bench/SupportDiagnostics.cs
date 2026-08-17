using CargoPilot.Application.Common.Models;
using CargoPilot.Application.Common.Optimization;

namespace CargoPilot.Engine.Bench;

/// <summary>
/// Destek eşiğini düşürmenin BEDELİ. Doluluk kazancı tek başına bir karar
/// dayanağı değil: eşik düştükçe kutular komşularının üzerinden daha çok taşar
/// ve devrilme riski artar. Karar veren kişinin iki sayıyı birlikte görmesi
/// gerekir.
///
/// Ölçülen şey üretilen planın GERÇEK destek dağılımıdır: her kutunun altındaki
/// dolu alan oranı. Oran hesabı kopyalanmaz, motorun kendi
/// <see cref="PlacementValidator.SupportRatio"/> kaynağından sorulur.
/// </summary>
public static class SupportDiagnostics
{
    /// <summary>Bugünkü politika; "kaç kutu bu kuralı ihlal ederdi" sorusunun ölçüsü.</summary>
    private const decimal TodayThreshold = 0.80m;

    private const decimal LowThreshold = 0.70m;

    public sealed record Distribution(
        double MeanRatio,
        double MinRatio,
        double BelowTodayPercent,
        double BelowLowPercent,
        double MaxOverhangCm,
        int StackedBoxes);

    public static Distribution Analyze(OptimizationInput input, OptimizationResult result)
    {
        ArgumentNullException.ThrowIfNull(input);
        ArgumentNullException.ThrowIfNull(result);

        var placed = DiagnosticPlacements.From(input, result);

        // Zemindeki kutular her zaman tam desteklidir; dagilimi onlarla sismek
        // sorulan seyi gizlerdi.
        var stacked = placed.Where(b => b.Y > 0m).ToList();
        if (stacked.Count == 0) return new Distribution(1d, 1d, 0d, 0d, 0d, 0);

        var ratios = new List<decimal>(stacked.Count);
        var maxOverhang = 0m;

        foreach (var box in stacked)
        {
            var ratio = PlacementValidator.SupportRatio(
                placed, box.X, box.Y, box.Z, box.Width, box.Length);

            ratios.Add(ratio);

            // Desteksiz kalan alanin en uzun kenari: sahada gozle gorulen sey
            // orandan cok bu — "kutunun kosesi 30 cm bosta duruyor".
            var unsupported = (1m - ratio) * box.Width * box.Length;
            var overhang = box.Length > 0m ? unsupported / box.Length : 0m;
            if (overhang > maxOverhang) maxOverhang = overhang;
        }

        return new Distribution(
            (double)ratios.Average(),
            (double)ratios.Min(),
            (double)ratios.Count(r => r < TodayThreshold) / stacked.Count * 100d,
            (double)ratios.Count(r => r < LowThreshold) / stacked.Count * 100d,
            (double)maxOverhang,
            stacked.Count);
    }
}
