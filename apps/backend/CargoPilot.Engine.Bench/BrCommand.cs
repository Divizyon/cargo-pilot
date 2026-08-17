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
                };

                var started = Stopwatch.GetTimestamp();
                var result = EngineHost.Run(input);

                durations.Add(Stopwatch.GetElapsedTime(started).TotalMilliseconds);
                fills.Add(result.FillRate * 100m);
            }

            all.AddRange(fills);

            var sample = instances[0];
            Console.WriteLine(string.Create(CultureInfo.InvariantCulture,
                $"BR{set,-3} {limit,6} {sample.Input.Items.Count,4} {sample.BoxCount,5} " +
                $"{sample.BoxVolumeRatio * 100m,6:F1} {Mean(fills),9:F2} {Percentile(fills, 0.50),8:F2} " +
                $"{fills.Min(),10:F2} {fills.Max(),11:F2} {PercentileD(durations, 0.50),10:F0}"));
        }

        Console.WriteLine();
        Console.WriteLine(string.Create(CultureInfo.InvariantCulture,
            $"BR1-BR7 ortalamasi: %{Mean(all):F2}  ({all.Count} ornek)"));

        return BenchOptions.ExitOk;
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
