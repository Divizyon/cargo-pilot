using CargoPilot.Application.Common.Models;
using CargoPilot.Application.Common.Optimization;
using CargoPilot.Application.Common.Optimization.WallBuilder;

namespace CargoPilot.Engine.Bench;

/// <summary>
/// "Bosluk var ama kutu sigmiyor" mu, "bosluk gercekten yok" mu.
///
/// Onceki teshis (<see cref="RejectionDiagnostics"/>) oturma yuksekligini ayak
/// izinin altindaki MAKSIMUM kabul ediyordu ve %99,4 "arac disi" cikariyordu.
/// Ama motor maximal-space defteri kullaniyor: yuksek sutunun YANINDAKI alcak
/// cebe kutu koyabiliyor. Yani o sayi bir ust sinirdi, gercek engel degil.
///
/// Bu olcum defteri yeniden kurar — kurallari kopyalamaz, motorun kendi
/// <see cref="SpaceLedger"/> sinifini kullanir ve yerlesimleri ayni sirayla
/// tekrar oynatir. Sonda kalan bosluklar gercek bosluklardir.
///
/// Sorulan soru: yerlesemeyen kutulardan kaci, kalan bir bosluga GEOMETRIK
/// olarak sigiyor? Sigiyorsa engel geometri degil kural ya da arama sirasidir;
/// sigmiyorsa hacim gercekten parcalanmis demektir.
/// </summary>
public static class SpaceDiagnostics
{
    public sealed record Spaces(
        int FreeSpaceCount,
        double FreeVolumePercent,
        double LargestFreeSpacePercent,
        double UnplacedFittingGeometricallyPercent,
        double UnplacedFittingAndSupportedPercent,
        double MeanFreeSpaceVolumeM3);

    public static Spaces Analyze(OptimizationInput input, OptimizationResult result)
    {
        ArgumentNullException.ThrowIfNull(input);
        ArgumentNullException.ThrowIfNull(result);

        var ledger = new SpaceLedger(input.VehicleWidth, input.VehicleHeight, input.VehicleLength, input.FillsFromMaxX);

        var minSide = input.Items.Count == 0
            ? 0m
            : input.Items.Min(i => Math.Min(i.Width, Math.Min(i.Height, i.Length)));

        foreach (var placement in result.Placements)
        {
            ledger.Place(placement.X, placement.Y, placement.Z,
                placement.Width, placement.Height, placement.Length, minSide);
        }

        var spaces = ledger.Spaces;
        var containerVolume = input.VehicleWidth * input.VehicleHeight * input.VehicleLength;

        // Bosluklar ust uste binebilir (maximal-space temsili), bu yuzden toplam
        // hacim degil EN BUYUK bosluk ve sayilari raporlanir.
        var largest = spaces.Count > 0 ? spaces.Max(s => s.Width * s.Height * s.Length) : 0m;
        var meanVolume = spaces.Count > 0 ? spaces.Average(s => (double)(s.Width * s.Height * s.Length)) : 0d;

        var placedVolume = result.Placements.Sum(p => p.Width * p.Height * p.Length);
        var freeVolume = containerVolume - placedVolume;

        var itemsById = input.Items.ToDictionary(i => i.ItemId);
        var placed = DiagnosticPlacements.From(input, result);
        var unplacedTotal = 0;
        var unplacedFitting = 0;
        var unplacedSupported = 0;

        foreach (var unplaced in result.UnplacedItems)
        {
            if (!itemsById.TryGetValue(unplaced.ItemId, out var item)) continue;

            unplacedTotal += unplaced.Quantity;
            if (!FitsSomewhere(spaces, item)) continue;

            unplacedFitting += unplaced.Quantity;

            // Geometrik sigmak yetmez: bosluğun TABANI destekli olmali. Kutu
            // bosluğun koseine konur ve %80 destek kurali motorun kendi
            // yukleminden sorulur.
            if (SupportedSomewhere(spaces, placed, item)) unplacedSupported += unplaced.Quantity;
        }

        return new Spaces(
            spaces.Count,
            Percent(freeVolume, containerVolume),
            Percent(largest, containerVolume),
            unplacedTotal == 0 ? 0d : (double)unplacedFitting / unplacedTotal * 100d,
            unplacedTotal == 0 ? 0d : (double)unplacedSupported / unplacedTotal * 100d,
            meanVolume / 1_000_000d);
    }

    /// <summary>
    /// Kutu, izin verilen yonelimlerden biriyle kalan bosluklardan birine sigiyor mu.
    /// Yonelim listesi motorun kendi kaynagindan gelir.
    /// </summary>
    private static bool FitsSomewhere(IReadOnlyList<FreeSpace> spaces, OptimizationItemInput item)
    {
        return PlacementValidator.GetOrientations(item)
            .Any(o => spaces.Any(space => space.Fits(o.width, o.height, o.length)));
    }

    /// <summary>
    /// Kutu, sigdigi bosluklardan BIRINDE destek de buluyor mu. Bulamiyorsa engel
    /// geometri degil %80 destek kuralidir — yani yigin ustunun engebesi.
    ///
    /// Aday konumlar motorun kendi uretecinden gelir: once bosluğun kosesi,
    /// kose desteksizse alttaki destek kutularinin kenarlarina hizali konumlar
    /// (<see cref="WallBuilderPlacement.SupportAligned"/>). Bu paylasim ZORUNLU:
    /// teshis yalnizca koseyi sinadigi surece motorun kendi kusurunu paylasir ve
    /// "destek bulamiyor" der — G-5'te tam olarak bu oldu, gercek sayi cok daha
    /// yuksekti.
    /// </summary>
    private static bool SupportedSomewhere(
        IReadOnlyList<FreeSpace> spaces, List<PlacedBox> placed, OptimizationItemInput item)
        => PlacementValidator.GetOrientations(item)
            .Any(o => spaces.Any(space => space.Fits(o.width, o.height, o.length)
                && SupportedInSpace(placed, space, o.width, o.length)));

    private static bool SupportedInSpace(
        List<PlacedBox> placed, FreeSpace space, decimal width, decimal length)
    {
        if (PlacementValidator.HasSupport(placed, space.X, space.Y, space.Z, width, length)) return true;

        var (x, z) = WallBuilderPlacement.SupportAligned(
            placed, space, space.X, space.Y, space.Z, width, length,
            zFloor: 0m, threshold: PlacementValidator.SupportThreshold);

        return PlacementValidator.HasSupport(placed, x, space.Y, z, width, length);
    }

    private static double Percent(decimal part, decimal total) => total == 0m ? 0d : (double)(part / total) * 100d;
}
