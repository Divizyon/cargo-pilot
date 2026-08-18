using CargoPilot.Application.Common.Models;
using CargoPilot.Application.Common.Optimization;

namespace CargoPilot.Engine.Bench;

/// <summary>
/// Yerlesemeyen kutular NEDEN yerlesemedi.
///
/// Kayip hacmin %15,8'i yiginin ustunde duruyor ve kutular hâlâ elde — demek ki
/// oraya konamiyorlar. Uc aday sebep var ve uculu icin uc bambaska mudahale
/// gerekir:
///
///   YER YOK        : gecerli hicbir konum kalmamis (hacim gercekten dolu).
///   DESTEKSIZ      : konum bos ve sinirlar icinde ama %80 destek saglanmiyor —
///                    yigin ustu engebeli.
///   CAKISMA        : konum baska kutuyla kesisiyor.
///
/// Uc tahmin ust uste tutmadigi icin (serit, yonelim anahtari, hizalanma tercihi)
/// bu kez tahmin yerine olcum: yerlesemeyen her kutu tipi, yiginin ust yuzeyindeki
/// her sutunda denenir ve ILK duseren kapi sayilir.
///
/// Kurallar KOPYALANMAZ; motorun kendi <see cref="PlacementValidator"/> yuklemleri
/// cagrilir.
/// </summary>
public static class RejectionDiagnostics
{
    private const int SampleStepCm = 20;

    public sealed record Reasons(
        double OutOfBoundsPercent,
        double OverlapPercent,
        double UnsupportedPercent,
        double StackRulePercent,
        double FeasiblePercent,
        int SampledPositions);

    public static Reasons Analyze(OptimizationInput input, OptimizationResult result)
    {
        ArgumentNullException.ThrowIfNull(input);
        ArgumentNullException.ThrowIfNull(result);

        var itemsById = input.Items.ToDictionary(i => i.ItemId);
        var placed = DiagnosticPlacements.From(input, result);

        var unplacedTypes = result.UnplacedItems
            .Select(u => itemsById.TryGetValue(u.ItemId, out var item) ? item : null)
            .Where(i => i is not null)
            .Select(i => i!)
            .DistinctBy(i => i.ItemId)
            .ToList();

        long outOfBounds = 0, overlap = 0, unsupported = 0, stackRule = 0, feasible = 0;

        foreach (var item in unplacedTypes)
        {
            foreach (var (width, height, length, _) in PlacementValidator.GetOrientations(item))
            {
                for (var x = 0m; x + width <= input.VehicleWidth; x += SampleStepCm)
                {
                    for (var z = 0m; z + length <= input.VehicleLength; z += SampleStepCm)
                    {
                        var y = SurfaceHeight(placed, x, z, width, length);

                        if (y + height > input.VehicleHeight) { outOfBounds++; continue; }
                        if (PlacementValidator.HasOverlap(placed, x, y, z, width, height, length)) { overlap++; continue; }
                        if (!PlacementValidator.HasSupport(placed, x, y, z, width, length)) { unsupported++; continue; }
                        if (PlacementValidator.ViolatesStackability(placed, x, y, z, width, length)
                            || PlacementValidator.ViolatesStackCount(placed, x, y, z, width, length)
                            || PlacementValidator.ViolatesStackWeight(placed, x, y, z, width, length, item.Weight)
                            || PlacementValidator.ViolatesFragility(placed, x, y, z, width, length))
                        {
                            stackRule++;
                            continue;
                        }

                        feasible++;
                    }
                }
            }
        }

        var total = outOfBounds + overlap + unsupported + stackRule + feasible;

        return new Reasons(
            Percent(outOfBounds, total),
            Percent(overlap, total),
            Percent(unsupported, total),
            Percent(stackRule, total),
            Percent(feasible, total),
            (int)total);
    }

    /// <summary>
    /// Verilen ayak izinin uzerine oturacagi yukseklik: o alanla kesisen kutularin
    /// en yuksek ust yuzeyi. Kutu havada duramaz, bu yuzden aday y bu degerdir.
    /// </summary>
    private static decimal SurfaceHeight(List<PlacedBox> placed, decimal x, decimal z, decimal width, decimal length)
    {
        var top = 0m;

        foreach (var box in placed)
        {
            if (box.X >= x + width || box.X + box.Width <= x) continue;
            if (box.Z >= z + length || box.Z + box.Length <= z) continue;

            var boxTop = box.Y + box.Height;
            if (boxTop > top) top = boxTop;
        }

        return top;
    }

    private static double Percent(long part, long total) => total == 0 ? 0d : (double)part / total * 100d;
}
