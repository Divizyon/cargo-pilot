using System.Diagnostics;
using System.Globalization;
using System.Text;
using System.Text.Json;
using CargoPilot.Application.Common.Models;

namespace CargoPilot.Engine.Bench;

/// <summary>
/// Dayaniklilik kosusu: tohum tohum ilerleyerek durmadan yeni senaryo uretir ve
/// hacim kalitesini biriktirir.
///
/// Neden sabit korpus degil: 60 senaryoluk sabit bir set, algoritmanin o sete
/// asiri uyum saglamasini olcemez. Her tohum yeni arac olculeri ve yeni kutu
/// dagilimi uretir; binlerce senaryodan sonra ortalama artik gurultu degil,
/// algoritmanin kendisidir.
///
/// Olculen sey ULASILAN / ULASILABILIR oranidir. Senaryolar konteynerin
/// bolunmus hali oldugu icin ulasilabilir doluluk %100'dur (bkz.
/// <see cref="VolumeCorpus"/>), yani doluluk dogrudan kalite yuzdesidir.
/// </summary>
public static class SoakCommand
{
    private static readonly JsonSerializerOptions ReportOptions = new()
    {
        WriteIndented = true,
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
    };

    public static int Run(BenchOptions options)
    {
        ArgumentNullException.ThrowIfNull(options);

        var deadline = TimeSpan.FromMinutes(options.DurationMinutes);
        var clock = Stopwatch.StartNew();
        var stats = new SoakStats($"{options.Strategy}+{options.Sequencer}");
        var lastReport = TimeSpan.Zero;

        Console.WriteLine(string.Create(CultureInfo.InvariantCulture,
            $"soak · strateji {options.Strategy} · sequencer {options.Sequencer} · sure {options.DurationMinutes} dk"));
        Console.WriteLine("ulasilabilir doluluk her senaryoda %100 (konteyner bolunerek uretiliyor)");
        Console.WriteLine();

        var waste = new List<WasteDiagnostics.Breakdown>();
        var rejections = new List<RejectionDiagnostics.Reasons>();
        var spaceStats = new List<SpaceDiagnostics.Spaces>();
        var seed = options.SeedFrom;

        // Kiyasta sure degil ADET sinirlanir: farkli butceler farkli sayida senaryo
        // kosarsa ortalamalar farkli kumeler uzerinden alinir ve kiyas anlamsizlasir.
        var limit = options.MaxScenarios > 0 ? options.MaxScenarios : int.MaxValue;

        while (clock.Elapsed < deadline && stats.Count < limit)
        {
            foreach (var scenario in VolumeCorpus.Generate(seed, options.Count))
            {
                if (clock.Elapsed >= deadline || stats.Count >= limit) break;

                var input = scenario.Input with
                {
                    Strategy = options.Strategy,
                    Sequencer = options.Sequencer,
                    SearchBudget = new SearchBudget(options.Iterations, options.Population, options.SearchMs, 15),
                };

                var started = Stopwatch.GetTimestamp();
                var result = EngineHost.Run(input);
                var elapsedMs = Stopwatch.GetElapsedTime(started).TotalMilliseconds;

                stats.Add(scenario, input, result, elapsedMs);
                if (options.Verbose)
                {
                    waste.Add(WasteDiagnostics.Analyze(input, result));
                    if (rejections.Count < 20) rejections.Add(RejectionDiagnostics.Analyze(input, result));
                    spaceStats.Add(SpaceDiagnostics.Analyze(input, result));
                }
            }

            seed++;

            if (clock.Elapsed - lastReport >= TimeSpan.FromSeconds(30))
            {
                lastReport = clock.Elapsed;
                Console.WriteLine(stats.ProgressLine(clock.Elapsed));
            }
        }

        Console.WriteLine();
        Console.WriteLine(stats.Summary(clock.Elapsed, seed - options.SeedFrom));

        if (waste.Count > 0) WriteWaste(waste);
        if (spaceStats.Count > 0) WriteSpaces(spaceStats);
        if (rejections.Count > 0) WriteRejections(rejections);
        if (options.ReportPath is not null) WriteReport(options.ReportPath, stats, clock.Elapsed);

        return BenchOptions.ExitOk;
    }

    /// <summary>
    /// Kayip hacmin ayrisimi. Ortalama alinir cunku sorulan sey tek senaryo degil,
    /// algoritmanin sistematik davranisi.
    /// </summary>
    private static void WriteWaste(List<WasteDiagnostics.Breakdown> waste)
    {
        Console.WriteLine("kayip hacim ayrisimi");
        Console.WriteLine(string.Create(CultureInfo.InvariantCulture,
            $"  dolu           : %{waste.Average(w => w.FillPercent):F2}"));
        Console.WriteLine(string.Create(CultureInfo.InvariantCulture,
            $"  olu hava       : %{waste.Average(w => w.DeadAirPercent):F2}  (yiginin USTUNDE kalan)"));
        Console.WriteLine(string.Create(CultureInfo.InvariantCulture,
            $"  ic bosluk      : %{waste.Average(w => w.InternalGapPercent):F2}  (yiginin ICINDE kalan)"));
        Console.WriteLine(string.Create(CultureInfo.InvariantCulture,
            $"  yigin yuksekligi: %{waste.Average(w => w.MeanPileHeightPercent):F2}  (arac yuksekliginin)"));
        Console.WriteLine(string.Create(CultureInfo.InvariantCulture,
            $"  ust yuzey engebe: {waste.Average(w => w.TopRoughnessCm):F1} cm (std sapma)"));
        Console.WriteLine(string.Create(CultureInfo.InvariantCulture,
            $"  duz sutun orani : %{waste.Average(w => w.FlatFractionPercent):F1}"));
        Console.WriteLine(string.Create(CultureInfo.InvariantCulture,
            $"  EN YUKSEK sutun : %{waste.Average(w => w.MaxPileHeightPercent):F1}  (etkin yuzey budur)"));
        Console.WriteLine();
    }

    /// <summary>
    /// Yerlesemeyen kutularin ret sebebi. Ornek sayisi kucuk tutulur: her senaryo
    /// icin binlerce konum taranir ve amac tam sayim degil, dagilim.
    /// </summary>
    /// <summary>
    /// Kalan bosluklarin durumu. Kritik sayi sonuncusudur: yerlesemeyen kutularin
    /// kaci bir bosluga GEOMETRIK olarak sigiyor. Yuksekse engel geometri degil
    /// arama sirasi ya da kural; dusukse hacim gercekten parcalanmis.
    /// </summary>
    private static void WriteSpaces(List<SpaceDiagnostics.Spaces> spaces)
    {
        Console.WriteLine("kalan bosluk durumu");
        Console.WriteLine(string.Create(CultureInfo.InvariantCulture,
            $"  bosluk sayisi  : {spaces.Average(s => s.FreeSpaceCount):F0}"));
        Console.WriteLine(string.Create(CultureInfo.InvariantCulture,
            $"  bos hacim      : %{spaces.Average(s => s.FreeVolumePercent):F1}"));
        Console.WriteLine(string.Create(CultureInfo.InvariantCulture,
            $"  en buyuk bosluk: %{spaces.Average(s => s.LargestFreeSpacePercent):F1} (aracin)"));
        Console.WriteLine(string.Create(CultureInfo.InvariantCulture,
            $"  ortalama bosluk: {spaces.Average(s => s.MeanFreeSpaceVolumeM3):F3} m3"));
        Console.WriteLine(string.Create(CultureInfo.InvariantCulture,
            $"  SIGAN yerlesemeyen: %{spaces.Average(s => s.UnplacedFittingGeometricallyPercent):F1}"));
        Console.WriteLine();
    }

    private static void WriteRejections(List<RejectionDiagnostics.Reasons> rejections)
    {
        Console.WriteLine(string.Create(CultureInfo.InvariantCulture,
            $"ret sebebi dagilimi ({rejections.Count} senaryo ornegi)"));
        Console.WriteLine(string.Create(CultureInfo.InvariantCulture,
            $"  arac disi      : %{rejections.Average(r => r.OutOfBoundsPercent):F1}"));
        Console.WriteLine(string.Create(CultureInfo.InvariantCulture,
            $"  cakisma        : %{rejections.Average(r => r.OverlapPercent):F1}"));
        Console.WriteLine(string.Create(CultureInfo.InvariantCulture,
            $"  DESTEKSIZ      : %{rejections.Average(r => r.UnsupportedPercent):F1}"));
        Console.WriteLine(string.Create(CultureInfo.InvariantCulture,
            $"  istif kurali   : %{rejections.Average(r => r.StackRulePercent):F1}"));
        Console.WriteLine(string.Create(CultureInfo.InvariantCulture,
            $"  UYGUN (kacan)  : %{rejections.Average(r => r.FeasiblePercent):F1}"));
        Console.WriteLine();
    }

    private static void WriteReport(string path, SoakStats stats, TimeSpan elapsed)
    {
        var directory = Path.GetDirectoryName(path);
        if (!string.IsNullOrEmpty(directory)) Directory.CreateDirectory(directory);

        File.WriteAllText(path, JsonSerializer.Serialize(stats.ToReport(elapsed), ReportOptions));
        Console.WriteLine(string.Create(CultureInfo.InvariantCulture, $"rapor: {path}"));
    }

    private sealed record ScenarioRecord(string Id, decimal FillPercent, int Placed, int Requested, double Ms);

    private sealed record SoakReport(
        string Strategy,
        int GeneratorVersion,
        double ElapsedSeconds,
        int Scenarios,
        double MeanFillPercent,
        double MedianFillPercent,
        double P5FillPercent,
        double WorstFillPercent,
        double BestFillPercent,
        double PlacedRatioPercent,
        double MedianMs,
        double P95Ms,
        IReadOnlyList<ScenarioRecord> Worst);

    private sealed class SoakStats(string strategy)
    {
        private readonly List<decimal> _fills = [];
        private readonly List<double> _durations = [];
        private readonly List<ScenarioRecord> _records = [];
        private long _placed;
        private long _requested;

        public int Count => _fills.Count;

        public void Add(
            VolumeCorpus.VolumeScenario scenario,
            OptimizationInput input,
            OptimizationResult result,
            double elapsedMs)
        {
            var requested = input.Items.Sum(i => i.Quantity);
            var fill = result.FillRate * 100m;

            _fills.Add(fill);
            _durations.Add(elapsedMs);
            _placed += result.Placements.Count;
            _requested += requested;

            _records.Add(new ScenarioRecord(scenario.Id, Math.Round(fill, 2), result.Placements.Count, requested, elapsedMs));

            // Yalnizca en kotu 20 senaryo saklanir: milyonlarca kaydi bellekte
            // tutmanin degeri yok, incelenecek olan kuyruk.
            if (_records.Count > 400)
            {
                _records.Sort((a, b) => a.FillPercent.CompareTo(b.FillPercent));
                _records.RemoveRange(20, _records.Count - 20);
            }
        }

        public string ProgressLine(TimeSpan elapsed)
            => string.Create(CultureInfo.InvariantCulture,
                $"  {elapsed:hh\\:mm\\:ss} · {Count,6} senaryo · ortalama %{Mean:F2} · medyan %{Percentile(_fills, 0.50):F2} · en kotu %{(_fills.Count > 0 ? _fills.Min() : 0m):F2}");

        public string Summary(TimeSpan elapsed, int seeds)
        {
            var builder = new StringBuilder();
            builder.AppendLine(string.Create(CultureInfo.InvariantCulture, $"strateji       : {strategy}"));
            builder.AppendLine(string.Create(CultureInfo.InvariantCulture, $"sure           : {elapsed:hh\\:mm\\:ss} · {seeds} tohum"));
            builder.AppendLine(string.Create(CultureInfo.InvariantCulture, $"senaryo        : {Count}"));
            builder.AppendLine();
            builder.AppendLine("doluluk (ulasilabilir = %100)");
            builder.AppendLine(string.Create(CultureInfo.InvariantCulture, $"  ortalama     : %{Mean:F2}"));
            builder.AppendLine(string.Create(CultureInfo.InvariantCulture, $"  medyan       : %{Percentile(_fills, 0.50):F2}"));
            builder.AppendLine(string.Create(CultureInfo.InvariantCulture, $"  p5 (alt kuyruk): %{Percentile(_fills, 0.05):F2}"));
            builder.AppendLine(string.Create(CultureInfo.InvariantCulture, $"  en kotu      : %{(_fills.Count > 0 ? _fills.Min() : 0m):F2}"));
            builder.AppendLine(string.Create(CultureInfo.InvariantCulture, $"  en iyi       : %{(_fills.Count > 0 ? _fills.Max() : 0m):F2}"));
            builder.AppendLine(string.Create(CultureInfo.InvariantCulture, $"  yerlesen kutu: %{PlacedRatio:F2}"));
            builder.AppendLine();
            builder.AppendLine("sure");
            builder.AppendLine(string.Create(CultureInfo.InvariantCulture, $"  medyan       : {PercentileD(_durations, 0.50):F2} ms"));
            builder.AppendLine(string.Create(CultureInfo.InvariantCulture, $"  p95          : {PercentileD(_durations, 0.95):F2} ms"));

            return builder.ToString();
        }

        public SoakReport ToReport(TimeSpan elapsed)
        {
            _records.Sort((a, b) => a.FillPercent.CompareTo(b.FillPercent));

            return new SoakReport(
                strategy,
                VolumeCorpus.Version,
                Math.Round(elapsed.TotalSeconds, 1),
                Count,
                Math.Round(Mean, 2),
                Math.Round((double)Percentile(_fills, 0.50), 2),
                Math.Round((double)Percentile(_fills, 0.05), 2),
                Math.Round((double)(_fills.Count > 0 ? _fills.Min() : 0m), 2),
                Math.Round((double)(_fills.Count > 0 ? _fills.Max() : 0m), 2),
                Math.Round(PlacedRatio, 2),
                Math.Round(PercentileD(_durations, 0.50), 2),
                Math.Round(PercentileD(_durations, 0.95), 2),
                [.. _records.Take(20)]);
        }

        private double Mean => _fills.Count == 0 ? 0d : (double)(_fills.Sum() / _fills.Count);

        private double PlacedRatio => _requested == 0 ? 0d : (double)_placed / _requested * 100d;

        private static decimal Percentile(List<decimal> values, double percentile)
        {
            if (values.Count == 0) return 0m;

            var sorted = values.Order().ToList();
            var index = (int)Math.Clamp(Math.Ceiling(percentile * sorted.Count) - 1, 0, sorted.Count - 1);

            return sorted[index];
        }

        private static double PercentileD(List<double> values, double percentile)
        {
            if (values.Count == 0) return 0d;

            var sorted = values.Order().ToList();
            var index = (int)Math.Clamp(Math.Ceiling(percentile * sorted.Count) - 1, 0, sorted.Count - 1);

            return sorted[index];
        }
    }
}
