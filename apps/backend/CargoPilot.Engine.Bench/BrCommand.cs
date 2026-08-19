using System.Diagnostics;
using System.Globalization;
using CargoPilot.Application.Common.Optimization.WallBuilder;
using CargoPilot.Application.Common.Models;

namespace CargoPilot.Engine.Bench;

/// <summary>
/// BR1-BR7 kosumu. Giyotin korpusundan farki, sayinin LITERATURLE kiyaslanabilir
/// olmasi: ayni ornekler yirmi bes yildir yayinlarda kullaniliyor.
///
/// Teshis degeri kumelerin sirasindadir. BR1 zayif heterojendir (uc tip, bol
/// tekrar) ve tekrarli desen kuran her teknik orada kazanir; BR7 guclu
/// heterojendir (yirmi tip) ve orada yalnizca bosluk yonetimi is gorur.
/// Merdivenin iki ucundaki fark, bir sonraki fazin hangisi olacagini soyler.
/// </summary>
public static class BrCommand
{
    public static int Run(BenchOptions options)
    {
        ArgumentNullException.ThrowIfNull(options);

        var sets = options.BrSet >= 0 ? [options.BrSet] : new[] { 1, 2, 3, 4, 5, 6, 7 };

        Console.WriteLine(string.Create(CultureInfo.InvariantCulture,
            $"BR · sequencer {options.Sequencer} · yonelim strict · yuk orani {options.BrLoadRatio:0.##}"));
        Console.WriteLine("uc yonelim bayragi da birebir eslendi (DR-42)");

        // Sigan-yuk rejiminde doluluk bir kalite olcusu degildir (bkz.
        // SpreadDiagnostics); okuyan kisi yanlis sutuna bakmasin diye soyleniyor.
        if (options.BrLoadRatio < 1m)
        {
            Console.WriteLine("KISMI YUK: doluluk yukun buyuklugudur, kalite olcusu YAYILMA ve DILIM sutunlaridir");
        }

        Console.WriteLine();
        Console.WriteLine("kume  ornek  tip  kutu  hacim%  doluluk%  medyan%  en dusuk%  en yuksek%  yayilma  dilim%  duvar  medyan ms");

        var all = new List<decimal>();
        var setResults = new List<BrBaseline.SetResult>();
        var waste = new List<WasteDiagnostics.Breakdown>();
        var spaces = new List<SpaceDiagnostics.Spaces>();
        var shape = new List<CorpusDiagnostics.Shape>();
        var support = new List<SupportDiagnostics.Distribution>();
        var maximality = new List<MaximalityDiagnostics.Report>();
        var walls = new List<WallDiagnostics.Report>();
        var constraints = new List<ConstraintDiagnostics.Report>();
        var catalog = new List<BlockCatalogDiagnostics.Report>();

        foreach (var set in sets)
        {
            var instances = BrCorpus.Load(set);
            var limit = options.MaxScenarios > 0 ? Math.Min(options.MaxScenarios, instances.Count) : instances.Count;

            var fills = new List<decimal>(limit);
            var durations = new List<double>(limit);
            var spreads = new List<SpreadDiagnostics.Report>(limit);

            for (var i = 0; i < limit; i++)
            {
                var instance = instances[i];
                var constrained = ConstraintCorpus.Apply(instance.Input, options.Constraints);
                var scaled = options.BrLoadRatio < 1m
                    ? constrained with { Items = Scale(constrained.Items, options.BrLoadRatio) }
                    : constrained;
                var input = scaled with
                {
                    Sequencer = options.Sequencer,
                    SearchBudget = new SearchBudget(options.Iterations, options.Population, options.SearchMs, options.Stall),
                    SupportThreshold = options.SupportThreshold,
                    DepthSlack = options.DepthSlack,
                    VcsWeights = options.VcsWeights,
                };

                var started = Stopwatch.GetTimestamp();
                var result = EngineHost.Run(input);

                durations.Add(Stopwatch.GetElapsedTime(started).TotalMilliseconds);
                fills.Add(result.FillRate * 100m);

                // Yayilma HER kosuda olculur: maliyeti yerlesim sayisinda
                // dogrusaldir ve kismi yuk rejiminin tek kalite olcusudur.
                spreads.Add(SpreadDiagnostics.Analyze(input, result));

                if (!options.Verbose) continue;

                waste.Add(WasteDiagnostics.Analyze(input, result));
                spaces.Add(SpaceDiagnostics.Analyze(input, result));
                shape.Add(CorpusDiagnostics.Analyze(input));
                support.Add(SupportDiagnostics.Analyze(input, result));
                maximality.Add(MaximalityDiagnostics.Analyze(input, result));
                walls.Add(WallDiagnostics.Analyze(input, result));
                constraints.Add(ConstraintDiagnostics.Analyze(input, result));
                catalog.Add(BlockCatalogDiagnostics.Analyze(input, BlockCatalog.DefaultMaxBlocks));
            }

            if (options.Verbose)
            {
                WriteDiagnostics(set, waste, spaces, shape, support, maximality, walls, catalog, constraints);
                waste.Clear();
                spaces.Clear();
                shape.Clear();
                support.Clear();
                maximality.Clear();
                walls.Clear();
                constraints.Clear();
                catalog.Clear();
            }

            var meanSpread = spreads.Count == 0 ? 1d : spreads.Average(s => s.SpreadRatio);
            var meanSlice = spreads.Count == 0 ? 0d : spreads.Average(s => s.SliceUtilPercent);
            var meanWalls = spreads.Count == 0 ? 0d : spreads.Average(s => s.WallCount);

            all.AddRange(fills);
            setResults.Add(new BrBaseline.SetResult(
                set,
                limit,
                Math.Round(Mean(fills), 2),
                Math.Round(meanSpread, 4),
                Math.Round(meanSlice, 2)));

            var sample = instances[0];
            Console.WriteLine(string.Create(CultureInfo.InvariantCulture,
                $"BR{set,-3} {limit,6} {sample.Input.Items.Count,4} {sample.BoxCount,5} " +
                $"{sample.BoxVolumeRatio * 100m,6:F1} {Mean(fills),9:F2} {Percentile(fills, 0.50),8:F2} " +
                $"{fills.Min(),10:F2} {fills.Max(),11:F2} {meanSpread,8:F3} {meanSlice,7:F1} " +
                $"{meanWalls,6:F1} {PercentileD(durations, 0.50),10:F0}"));
        }

        Console.WriteLine();
        Console.WriteLine(string.Create(CultureInfo.InvariantCulture,
            $"BR1-BR7 ortalamasi: %{Mean(all):F2}  ({all.Count} ornek)" +
            $"  ·  yayilma x{setResults.Average(r => r.MeanSpreadRatio ?? 1d):F3}" +
            $"  ·  dilim %{setResults.Average(r => r.MeanSliceUtilPercent ?? 0d):F1}"));

        var report = new BrBaseline.Report(
            "WallBuilder",
            options.Sequencer.ToString(),
            "Strict",
            Math.Round(Mean(all), 2),
            setResults,
            options.BrLoadRatio);

        if (options.ReportPath is not null) BrBaseline.Write(options.ReportPath, report);

        if (options.BaselinePath is null) return BenchOptions.ExitOk;

        Console.WriteLine();

        return BrBaseline.Matches(options.BaselinePath, report) ? BenchOptions.ExitOk : BenchOptions.ExitFailed;
    }

    /// <summary>
    /// Kume basina teshis. Ozet tablo "ne kadar" der, bu satirlar "neden" der:
    /// kayip hacim yiginin ustunde mi icinde mi, kalan bosluklar gercek mi.
    /// </summary>
    private static void WriteDiagnostics(
        int set,
        List<WasteDiagnostics.Breakdown> waste,
        List<SpaceDiagnostics.Spaces> spaces,
        List<CorpusDiagnostics.Shape> shape,
        List<SupportDiagnostics.Distribution> support,
        List<MaximalityDiagnostics.Report> maximality,
        List<WallDiagnostics.Report> walls,
        List<BlockCatalogDiagnostics.Report> catalog,
        List<ConstraintDiagnostics.Report> constraints)
    {
        Console.WriteLine(string.Create(CultureInfo.InvariantCulture,
            $"      BR{set} teshis · olu hava %{waste.Average(w => w.DeadAirPercent):F1}" +
            $" · ic bosluk %{waste.Average(w => w.InternalGapPercent):F1}" +
            $" · yigin %{waste.Average(w => w.MeanPileHeightPercent):F1}" +
            $" · engebe {waste.Average(w => w.TopRoughnessCm):F0} cm" +
            $" · duz sutun %{waste.Average(w => w.FlatFractionPercent):F1}"));
        Console.WriteLine(string.Create(CultureInfo.InvariantCulture,
            $"           bosluk {spaces.Average(s => s.FreeSpaceCount):F0}" +
            $" · sigan yerlesemeyen %{spaces.Average(s => s.UnplacedFittingGeometricallyPercent):F1}" +
            $" · sigan+destekli %{spaces.Average(s => s.UnplacedFittingAndSupportedPercent):F1}" +
            $" · ortalama adet {shape.Average(s => s.MeanQuantity):F1}"));
        Console.WriteLine(string.Create(CultureInfo.InvariantCulture,
            $"           destek ort %{support.Average(s => s.MeanRatio) * 100d:F1}" +
            $" · en dusuk %{support.Average(s => s.MinRatio) * 100d:F1}" +
            $" · %80 alti {support.Average(s => s.BelowTodayPercent):F1}%" +
            $" · %70 alti {support.Average(s => s.BelowLowPercent):F1}%" +
            $" · azami tasma {support.Average(s => s.MaxOverhangCm):F0} cm"));
        Console.WriteLine(string.Create(CultureInfo.InvariantCulture,
            $"           MAKSIMAL OLMAYAN bosluk %{maximality.Average(m => m.NonMaximalSharePercent):F1}" +
            $" · ortalama buyume %{maximality.Average(m => m.MeanGrowthPercent):F1}" +
            $" · azami buyume %{maximality.Average(m => m.MaxGrowthPercent):F0}"));
        var wallSource = string.Create(CultureInfo.InvariantCulture,
            $"DUVAR DISI kutu %{walls.Average(w => w.BoxesOutsideWallsPercent):F1}");
        Console.WriteLine(string.Create(CultureInfo.InvariantCulture,
            $"           DUVAR {walls.Average(w => w.WallCount):F1} adet ({wallSource})"
            + $" · derinlik {walls.Average(w => w.MeanWallDepthCm):F0} cm"
            + $" · kutu/duvar {walls.Average(w => w.MeanBoxesPerWall):F1}"
            + $" · YUZ KAPLAMA ort %{walls.Average(w => w.MeanFaceCoveragePercent):F1}"
            + $" · en dusuk %{walls.Average(w => w.MinFaceCoveragePercent):F1}"
            + $" · %95 alti duvar %{walls.Average(w => w.WallsBelowThresholdPercent):F0}"));
        Console.WriteLine(string.Create(CultureInfo.InvariantCulture,
            $"           YUK DERINLIGI %{walls.Average(w => w.LoadDepthPercent):F1} (doluluga yakin = yogun, cok ustunde = yayilmis)"
            + $" · olu hava · bos sutun (kenar seridi) %{walls.Average(w => w.DeadAirInEmptyColumnsPercent):F1}"
            + $" · tavan artigi %{walls.Average(w => w.DeadAirAbovePilePercent):F1}"));
        Console.WriteLine(string.Create(CultureInfo.InvariantCulture,
            $"           BLOK KATALOGU {catalog.Average(c => c.BlockCount):F0} blok"
            + $" · uretim {catalog.Average(c => c.BuildMs):F1} ms"
            + $" · sinira dayanan %{100d * catalog.Count(c => c.HitCap) / catalog.Count:F0}"
            + $" · kutu/blok ort {catalog.Average(c => c.MeanBoxesPerBlock):F1}"
            + $" · azami {catalog.Max(c => c.MaxBoxesPerBlock)}"));
        Console.WriteLine(string.Create(CultureInfo.InvariantCulture,
            $"           KISIT · kisitli kutu %{100d * constraints.Sum(c => c.ConstrainedBoxes) / Math.Max(1, constraints.Sum(c => c.PlacedBoxes)):F0}"
            + $" · BOLGE ihlali {constraints.Sum(c => c.ZoneViolations)}"
            + $" · KIRILGANLIK ihlali {constraints.Sum(c => c.FragilityViolations)}"
            + $" · ISTIF ihlali {constraints.Sum(c => c.StackViolations)}"));
    }

    /// <summary>
    /// Kismi doluluk sinamasi icin adetleri olcekler. Musterinin katman insasini
    /// reddetme gerekcesi (DR-12) yalnizca YARIM DOLU araclarda gorunur; BR
    /// ornekleri neredeyse tam dolu oldugu icin orada sinanamaz.
    /// </summary>
    /// <summary>
    /// Ornegi hedef yuk oranina indirir: sonucun toplam kutu hacmi, ozgun
    /// hacmin <paramref name="ratio"/> katini ASMAZ ve ona en yakin degerdir.
    ///
    /// Neden basit carpma yetmiyor: onceki surum <c>max(1, adet x oran)</c>
    /// yapiyordu. BR15'te tip basina adet ~1 oldugundan her tip 1'de kaliyor ve
    /// "%25 yuk" aslinda TAM YUK olarak kosuyordu — yani kismi rejim hic
    /// olculmemis oluyordu.
    ///
    /// En buyuk artik yontemi kullanilir: once oransal taban, sonra artigi
    /// buyuk olan tipten baslayarak birer birer eklenir. Boylece cok tipli
    /// kumelerde tip CESITLILIGI korunur; adet dusurmek yerine tip basina bir
    /// kutu birakmak, heterojenlik merdivenini bozmamak icin onemlidir.
    ///
    /// Rastgelelik yoktur: esitlikte tip sirasi karar verir (R-C02).
    /// </summary>
    private static IReadOnlyList<OptimizationItemInput> Scale(
        IReadOnlyList<OptimizationItemInput> items,
        decimal ratio)
    {
        var unit = items.Select(i => i.Width * i.Height * i.Length).ToArray();
        var goal = items.Select((i, k) => unit[k] * i.Quantity).Sum() * ratio;

        var counts = new int[items.Count];
        var used = 0m;

        for (var k = 0; k < items.Count; k++)
        {
            counts[k] = (int)(items[k].Quantity * ratio);
            used += counts[k] * unit[k];
        }

        var order = Enumerable.Range(0, items.Count)
            .OrderByDescending(k => items[k].Quantity * ratio - counts[k])
            .ThenBy(k => k)
            .ToArray();

        var added = true;
        while (added)
        {
            added = false;
            foreach (var k in order)
            {
                if (used + unit[k] > goal) continue;

                counts[k]++;
                used += unit[k];
                added = true;
            }
        }

        // Bos ornek anlamsiz olurdu; cok kucuk oranlarda en az bir kutu kalir.
        if (counts.All(c => c == 0)) counts[0] = 1;

        return [.. items.Select((i, k) => i with { Quantity = counts[k] }).Where(i => i.Quantity > 0)];
    }

    private static decimal Mean(List<decimal> values)
        => values.Count == 0 ? 0m : values.Sum() / values.Count;

    private static decimal Percentile(List<decimal> values, double q)
    {
        if (values.Count == 0) return 0m;

        var sorted = new List<decimal>(values);
        sorted.Sort();

        return sorted[Math.Clamp((int)(q * (sorted.Count - 1)), 0, sorted.Count - 1)];
    }

    private static double PercentileD(List<double> values, double q)
    {
        if (values.Count == 0) return 0d;

        var sorted = new List<double>(values);
        sorted.Sort();

        return sorted[Math.Clamp((int)(q * (sorted.Count - 1)), 0, sorted.Count - 1)];
    }
}
