using System.Diagnostics;
using System.Globalization;
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

        var mode = options.BrOrientation;
        var sets = options.BrSet > 0 ? [options.BrSet] : new[] { 1, 2, 3, 4, 5, 6, 7 };

        Console.WriteLine(string.Create(CultureInfo.InvariantCulture,
            $"BR · strateji {options.Strategy} · sequencer {options.Sequencer} · yonelim {mode}"));
        Console.WriteLine(mode == BrCorpus.OrientationMode.Strict
            ? "belirsiz yonelim kisitli okundu: sonuc BR'nin ALT siniri"
            : "belirsiz yonelim serbest okundu: sonuc BR'nin UST siniri");
        Console.WriteLine();
        Console.WriteLine("kume  ornek  tip  kutu  hacim%  doluluk%  medyan%  en dusuk%  en yuksek%  medyan ms");

        var all = new List<decimal>();
        var setResults = new List<BrBaseline.SetResult>();
        var waste = new List<WasteDiagnostics.Breakdown>();
        var spaces = new List<SpaceDiagnostics.Spaces>();
        var shape = new List<CorpusDiagnostics.Shape>();
        var support = new List<SupportDiagnostics.Distribution>();

        foreach (var set in sets)
        {
            var instances = BrCorpus.Load(set, mode);
            var limit = options.MaxScenarios > 0 ? Math.Min(options.MaxScenarios, instances.Count) : instances.Count;

            var fills = new List<decimal>(limit);
            var durations = new List<double>(limit);

            for (var i = 0; i < limit; i++)
            {
                var instance = instances[i];
                var input = instance.Input with
                {
                    Strategy = options.Strategy,
                    Sequencer = options.Sequencer,
                    SearchBudget = new SearchBudget(options.Iterations, options.Population, options.SearchMs, 15),
                    SupportThreshold = options.SupportThreshold,
                };

                var started = Stopwatch.GetTimestamp();
                var result = EngineHost.Run(input);

                durations.Add(Stopwatch.GetElapsedTime(started).TotalMilliseconds);
                fills.Add(result.FillRate * 100m);

                if (!options.Verbose) continue;

                waste.Add(WasteDiagnostics.Analyze(input, result));
                spaces.Add(SpaceDiagnostics.Analyze(input, result));
                shape.Add(CorpusDiagnostics.Analyze(input));
                support.Add(SupportDiagnostics.Analyze(input, result));
            }

            if (options.Verbose)
            {
                WriteDiagnostics(set, waste, spaces, shape, support);
                waste.Clear();
                spaces.Clear();
                shape.Clear();
                support.Clear();
            }

            all.AddRange(fills);
            setResults.Add(new BrBaseline.SetResult(set, limit, Math.Round(Mean(fills), 2)));

            var sample = instances[0];
            Console.WriteLine(string.Create(CultureInfo.InvariantCulture,
                $"BR{set,-3} {limit,6} {sample.Input.Items.Count,4} {sample.BoxCount,5} " +
                $"{sample.BoxVolumeRatio * 100m,6:F1} {Mean(fills),9:F2} {Percentile(fills, 0.50),8:F2} " +
                $"{fills.Min(),10:F2} {fills.Max(),11:F2} {PercentileD(durations, 0.50),10:F0}"));
        }

        Console.WriteLine();
        Console.WriteLine(string.Create(CultureInfo.InvariantCulture,
            $"BR1-BR7 ortalamasi: %{Mean(all):F2}  ({all.Count} ornek)"));

        var report = new BrBaseline.Report(
            options.Strategy.ToString(),
            options.Sequencer.ToString(),
            mode.ToString(),
            Math.Round(Mean(all), 2),
            setResults);

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
        List<SupportDiagnostics.Distribution> support)
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
