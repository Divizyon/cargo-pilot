using CargoPilot.Application.Common.Models;
using CargoPilot.Application.Common.Optimization;
using CargoPilot.Domain.Enums;

namespace CargoPilot.Engine.Bench;

/// <summary>
/// Kisit IHLALI taramasi (DR-38, R-C14'un <c>ZoneViolations</c> metrigi).
///
/// Sekiz sert kapi yerlestirme aninda zaten uygulaniyor, yani buradaki sayilar
/// SIFIR olmali. Deger tam da bunda: sifir olmadigi anda bir hata vardir ve
/// yedi yuz ornek uzerinde aranmasi, on yedi elle yazilmis senaryonun
/// veremeyecegi bir guvencedir.
///
/// Gerekcesi yasanmisdir: <c>DepthSlack</c> ile LIFO bolgeleri catisti ve hata
/// yalnizca varsayilan acildiginda, degismez testleri sayesinde goruldu
/// (DR-57). Kisitli korpus olsaydi ayni hata olcumde de gorunurdu.
///
/// Sifira ek olarak KAPSAMA da raporlanir: kisit hic ateslenmediyse sifir ihlal
/// bir guvence degil, bir yanilsamadir.
/// </summary>
public static class ConstraintDiagnostics
{
    public sealed record Report(
        int ZoneViolations,
        int FragilityViolations,
        int StackViolations,
        int ConstrainedBoxes,
        int PlacedBoxes);

    public static Report Analyze(OptimizationInput input, OptimizationResult result)
    {
        ArgumentNullException.ThrowIfNull(input);
        ArgumentNullException.ThrowIfNull(result);

        var itemsById = input.Items.ToDictionary(i => i.ItemId);
        var placed = DiagnosticPlacements.From(input, result);

        var zone = 0;
        var fragility = 0;
        var stack = 0;
        var constrained = 0;

        foreach (var box in placed)
        {
            if (!itemsById.TryGetValue(box.ItemId, out var item)) continue;

            var hasConstraint = item.UnloadingOrder.HasValue
                || item.FragilityType == FragilityType.Fragile
                || item.MaxStackCount > 0;

            if (hasConstraint) constrained++;

            // LIFO: kutu, kendi inis sirasi geldiginde HALA ARACTA OLAN bir
            // kutuyu oynatmadan kapiya cikabilmeli. Olcut motorun kendi
            // kuralidir; teshis ile motor ayni tanimi paylasmazsa olculen sey
            // motorun uygulamadigi bir kural olur (bir kez yasandi).
            if (PlacementValidator.ViolatesUnloadPath(
                placed, box.X, box.Y, box.Z, box.Width, box.Height, box.Length, item.UnloadingOrder))
            {
                zone++;
            }

            // Kirilgan kutunun ustunde hicbir kutu olamaz.
            if (item.FragilityType == FragilityType.Fragile && CountAbove(placed, box) > 0) fragility++;

            // Istif siniri: ustteki kutu sayisi esigi asamaz.
            if (item.MaxStackCount > 0 && CountAbove(placed, box) > item.MaxStackCount) stack++;
        }

        return new Report(zone, fragility, stack, constrained, placed.Count);
    }

    /// <summary>Kutunun ayak izini kesen ve daha yukarida duran kutu sayisi.</summary>
    private static int CountAbove(List<PlacedBox> placed, PlacedBox box)
    {
        var top = box.Y + box.Height;
        var count = 0;

        foreach (var other in placed)
        {
            if (other.Y < top) continue;

            var overlapX = Math.Min(box.X + box.Width, other.X + other.Width) - Math.Max(box.X, other.X);
            var overlapZ = Math.Min(box.Z + box.Length, other.Z + other.Length) - Math.Max(box.Z, other.Z);

            if (overlapX > 0m && overlapZ > 0m) count++;
        }

        return count;
    }
}
