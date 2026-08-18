using CargoPilot.Application.Common.Models;
using CargoPilot.Application.Common.Optimization;
using CargoPilot.Application.Common.Optimization.WallBuilder;

namespace CargoPilot.Engine.Bench;

/// <summary>
/// Boşluk defterindeki boşluklar gerçekten **maksimal** mi?
///
/// Soru şuradan geliyor: `R-C11` amalgamation'ı (dar boşlukları komşuyla
/// birleştirme) Parreño'nun maximal-space temsili için tarif ediyor. Bizim
/// defterimizde iki maksimal boşluğu birleştirmek prizma vermez — yani madde
/// anlamsız görünüyor. **Ama** bu, boşlukların gerçekten maksimal olmasına
/// bağlı: <c>AddSplits</c> kesilen boşluğun dilimlerini üretiyor ve o dilimler
/// KOMŞU boş bölgeye uzayabilecekken uzatılmıyor.
///
/// Ölçüm bunu tahmin etmek yerine sınıyor: her boşluğun altı yüzü, bir kutuya
/// ya da araç duvarına çarpana kadar itilir. Kazanılan hacim sıfıra yakınsa
/// defter zaten maksimaldir ve amalgamation gerçekten anlamsızdır; büyükse
/// defter hacmin bir kısmını göremiyor demektir.
/// </summary>
public static class MaximalityDiagnostics
{
    public sealed record Report(
        double MeanGrowthPercent,
        double MaxGrowthPercent,
        double NonMaximalSharePercent,
        int SpaceCount);

    public static Report Analyze(OptimizationInput input, OptimizationResult result)
    {
        ArgumentNullException.ThrowIfNull(input);
        ArgumentNullException.ThrowIfNull(result);

        var placed = DiagnosticPlacements.From(input, result);
        var ledger = new SpaceLedger(input.VehicleWidth, input.VehicleHeight, input.VehicleLength, input.FillsFromMaxX);

        var minSide = input.Items.Count == 0
            ? 0m
            : input.Items.Min(i => Math.Min(i.Width, Math.Min(i.Height, i.Length)));

        foreach (var box in placed)
        {
            ledger.Place(box.X, box.Y, box.Z, box.Width, box.Height, box.Length, minSide);
        }

        var spaces = ledger.Spaces;
        if (spaces.Count == 0) return new Report(0d, 0d, 0d, 0);

        var growths = new List<double>(spaces.Count);
        var nonMaximal = 0;

        foreach (var space in spaces)
        {
            var grown = Grow(space, placed, input);
            var before = (double)(space.Width * space.Height * space.Length);
            var after = (double)((grown.MaxX - grown.X) * (grown.MaxY - grown.Y) * (grown.MaxZ - grown.Z));

            var growth = before <= 0d ? 0d : (after - before) / before * 100d;

            growths.Add(growth);
            if (growth > 0.5d) nonMaximal++;
        }

        return new Report(
            growths.Average(),
            growths.Max(),
            (double)nonMaximal / spaces.Count * 100d,
            spaces.Count);
    }

    private readonly record struct Box(decimal X, decimal Y, decimal Z, decimal MaxX, decimal MaxY, decimal MaxZ);

    /// <summary>
    /// Boşluğun altı yüzünü, bir kutuya ya da araç duvarına çarpana kadar iter.
    /// Yönler sırayla işlenir; sıra sonucu etkileyebilir ama ölçülen şey "hiç
    /// büyüyebiliyor mu", yani en iyi sıralamayı aramaya gerek yok.
    /// </summary>
    private static Box Grow(FreeSpace space, List<PlacedBox> placed, OptimizationInput input)
    {
        var box = new Box(space.X, space.Y, space.Z, space.MaxX, space.MaxY, space.MaxZ);

        box = box with { MaxX = Limit(placed, box, input.VehicleWidth, Axis.X) };
        box = box with { MaxY = Limit(placed, box, input.VehicleHeight, Axis.Y) };
        box = box with { MaxZ = Limit(placed, box, input.VehicleLength, Axis.Z) };
        box = box with { X = LimitLow(placed, box, Axis.X) };
        box = box with { Y = LimitLow(placed, box, Axis.Y) };
        box = box with { Z = LimitLow(placed, box, Axis.Z) };

        return box;
    }

    private enum Axis { X, Y, Z }

    private static decimal Limit(List<PlacedBox> placed, Box box, decimal wall, Axis axis)
    {
        var limit = wall;

        foreach (var b in placed)
        {
            if (!OverlapsOtherTwo(box, b, axis)) continue;

            var start = axis switch { Axis.X => b.X, Axis.Y => b.Y, _ => b.Z };
            var from = axis switch { Axis.X => box.MaxX, Axis.Y => box.MaxY, _ => box.MaxZ };

            if (start >= from && start < limit) limit = start;
        }

        return limit;
    }

    private static decimal LimitLow(List<PlacedBox> placed, Box box, Axis axis)
    {
        var limit = 0m;

        foreach (var b in placed)
        {
            if (!OverlapsOtherTwo(box, b, axis)) continue;

            var end = axis switch { Axis.X => b.X + b.Width, Axis.Y => b.Y + b.Height, _ => b.Z + b.Length };
            var to = axis switch { Axis.X => box.X, Axis.Y => box.Y, _ => box.Z };

            if (end <= to && end > limit) limit = end;
        }

        return limit;
    }

    /// <summary>Kutu, verilen eksen DIŞINDAKİ iki eksende boşlukla kesişiyor mu.</summary>
    private static bool OverlapsOtherTwo(Box box, PlacedBox b, Axis axis)
    {
        var x = b.X < box.MaxX && box.X < b.X + b.Width;
        var y = b.Y < box.MaxY && box.Y < b.Y + b.Height;
        var z = b.Z < box.MaxZ && box.Z < b.Z + b.Length;

        return axis switch
        {
            Axis.X => y && z,
            Axis.Y => x && z,
            _ => x && y,
        };
    }
}
