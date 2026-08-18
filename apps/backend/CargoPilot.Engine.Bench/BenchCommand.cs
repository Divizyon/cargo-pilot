using System.Diagnostics;
using System.Globalization;
using System.Text.Json;
using CargoPilot.Application.Common.Models;
using CargoPilot.Domain.Enums;

namespace CargoPilot.Engine.Bench;

/// <summary>
/// Olcum kipi: senaryolari uretir, motoru dogrudan cagirir, damga ve sure
/// dagilimi basar.
///
/// Sureler kapiya girmez, ayri bolumde raporlanir: determinizm damgayla olculur,
/// performans medyan/p95 ile. Ikisini karistirmak her kosuyu kirmizi yakardi.
/// </summary>
public static class BenchCommand
{
    private static readonly JsonSerializerOptions DumpOptions = new()
    {
        WriteIndented = true,
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
    };

    public static int Run(BenchOptions options)
    {
        ArgumentNullException.ThrowIfNull(options);

        var seeds = options.Seeds.ToList();
        Console.WriteLine(string.Create(CultureInfo.InvariantCulture, 
            $"sequencer {options.Sequencer} · tohum {options.SeedFrom}..{options.SeedTo} · senaryo/tohum {options.Count} · tekrar {options.Repeat} · es zaman {options.Concurrency}"));

        var digestsPerPass = new List<string>(options.Repeat);
        var durations = new List<double>();
        var totals = new RunTotals();

        var scenarios = seeds
            .SelectMany(seed => BenchCorpus.Generate(seed, options.Count))
            .Select(s => s with
            {
                Input = s.Input with
                {
                    Sequencer = options.Sequencer,
                    SearchBudget = new SearchBudget(options.Iterations, options.Population, options.SearchMs, options.Stall),
                },
            })
            .ToList();

        for (var pass = 1; pass <= options.Repeat; pass++)
        {
            // Senaryolar birbirinden bagimsiz: motor durum tutmuyor ve her senaryo
            // kendi girdisiyle kosuyor. Bu yuzden es zamanli kosmak damgayi
            // etkilemez — damga senaryo bazinda uretilip kanonik siraya sokuluyor.
            // Sure olcumu ise es zamanlilikta guvenilmez; rapor bunu yaziyor.
            var outcomes = new (string Digest, double Ms, OptimizationResult Result)[scenarios.Count];

            if (options.Concurrency > 1)
            {
                Parallel.For(0, scenarios.Count, new ParallelOptions { MaxDegreeOfParallelism = options.Concurrency },
                    index => outcomes[index] = Execute(scenarios[index]));
            }
            else
            {
                for (var index = 0; index < scenarios.Count; index++)
                {
                    outcomes[index] = Execute(scenarios[index]);
                }
            }

            digestsPerPass.Add(DeterminismDigest.OfRun(
                scenarios.Select((scenario, index) => (scenario.Id, outcomes[index].Digest))));

            if (pass != 1) continue;

            for (var index = 0; index < scenarios.Count; index++)
            {
                durations.Add(outcomes[index].Ms);
                totals.Add(scenarios[index].Input, outcomes[index].Result);
                if (options.Verbose) WriteScenarioLine(scenarios[index], outcomes[index].Result, outcomes[index].Ms);
                if (options.DumpDirectory is not null) Dump(options.DumpDirectory, scenarios[index]);
            }
        }

        return Report(options, digestsPerPass, durations, totals);
    }

    private static (string Digest, double Ms, OptimizationResult Result) Execute(BenchCorpus.BenchScenario scenario)
    {
        var stopwatch = Stopwatch.StartNew();
        var result = EngineHost.Run(scenario.Input);
        stopwatch.Stop();

        return (DeterminismDigest.OfScenario(scenario.Id, result), stopwatch.Elapsed.TotalMilliseconds, result);
    }

    private static int Report(
        BenchOptions options,
        List<string> digestsPerPass,
        List<double> durations,
        RunTotals totals)
    {
        var stable = digestsPerPass.Distinct(StringComparer.Ordinal).Count() == 1;

        Console.WriteLine();
        Console.WriteLine(string.Create(CultureInfo.InvariantCulture, $"senaryo        : {totals.ScenarioCount}"));
        Console.WriteLine(string.Create(CultureInfo.InvariantCulture, $"yerlesen kutu  : {totals.Placed} / {totals.Requested}"));
        Console.WriteLine(string.Create(CultureInfo.InvariantCulture, $"ortalama dolu. : %{totals.MeanFillPercent:F2}"));
        Console.WriteLine(string.Create(CultureInfo.InvariantCulture, $"en kotu dolu.  : %{totals.WorstFillPercent:F2}"));

        // Denge yalnizca WeightBalance kriterli senaryolarda anlamli; oteki iki
        // kriterde agirlik merkezi bir hedef degil, yan urun.
        if (totals.BalanceScenarioCount > 0)
        {
            Console.WriteLine(string.Create(CultureInfo.InvariantCulture,
                $"denge ort sapma: %{totals.MeanBalanceOffsetPercent:F2}  ({totals.BalanceScenarioCount} senaryo)"));
            Console.WriteLine(string.Create(CultureInfo.InvariantCulture,
                $"denge en kotu  : %{totals.WorstBalanceOffsetPercent:F2}"));
        }
        Console.WriteLine();
        Console.WriteLine(options.Concurrency > 1
            ? "performans (kapi disi · es zamanli kosu, sureler guvenilmez)"
            : "performans (kapi disi)");
        Console.WriteLine(string.Create(CultureInfo.InvariantCulture, $"  medyan       : {Percentile(durations, 0.50):F2} ms"));
        Console.WriteLine(string.Create(CultureInfo.InvariantCulture, $"  p95          : {Percentile(durations, 0.95):F2} ms"));
        Console.WriteLine(string.Create(CultureInfo.InvariantCulture, $"  toplam       : {durations.Sum():F0} ms"));
        Console.WriteLine();
        Console.WriteLine(string.Create(CultureInfo.InvariantCulture, $"damga          : {digestsPerPass[0]}"));

        if (stable)
        {
            Console.WriteLine(string.Create(CultureInfo.InvariantCulture, $"determinizm    : {options.Repeat} turun {options.Repeat}'inde ayni"));

            return BenchOptions.ExitOk;
        }

        Console.Error.WriteLine("determinizm    : KIRIK — turlar arasi damga farki var");
        for (var i = 0; i < digestsPerPass.Count; i++)
        {
            Console.Error.WriteLine(string.Create(CultureInfo.InvariantCulture, $"  tur {i + 1}: {digestsPerPass[i]}"));
        }

        return BenchOptions.ExitFailed;
    }

    private static void WriteScenarioLine(BenchCorpus.BenchScenario scenario, OptimizationResult result, double ms)
        => Console.WriteLine(string.Create(CultureInfo.InvariantCulture, 
            $"  {scenario.Id}  kutu={result.Placements.Count,4}  disarida={result.UnplacedItems.Sum(u => u.Quantity),4}  doluluk=%{result.FillRate * 100m:F1}  {ms:F1} ms"));

    private static void Dump(string directory, BenchCorpus.BenchScenario scenario)
    {
        Directory.CreateDirectory(directory);
        var path = Path.Combine(directory, scenario.Id + ".input.json");
        File.WriteAllText(path, JsonSerializer.Serialize(scenario.Input, DumpOptions));
    }

    private static double Percentile(List<double> values, double percentile)
    {
        if (values.Count == 0) return 0d;

        var sorted = values.Order().ToList();
        var index = (int)Math.Clamp(Math.Ceiling(percentile * sorted.Count) - 1, 0, sorted.Count - 1);

        return sorted[index];
    }

    private sealed class RunTotals
    {
        private decimal _fillSum;
        private decimal _worstFill = decimal.MaxValue;

        // Agirlik merkezinin arac ortasindan sapmasi, iki eksenin toplami.
        // Greedy silinmeden once olculmek zorunda: WallBuilder'da denge
        // optimizasyonu yok ve kaybin buyuklugu sonradan hesaplanamaz.
        private decimal _balanceSum;
        private decimal _worstBalance;

        public int ScenarioCount { get; private set; }

        public int Placed { get; private set; }

        public int Requested { get; private set; }

        public double MeanFillPercent => ScenarioCount == 0 ? 0d : (double)(_fillSum / ScenarioCount) * 100d;

        public double WorstFillPercent => ScenarioCount == 0 ? 0d : (double)_worstFill * 100d;

        public int BalanceScenarioCount { get; private set; }

        public double MeanBalanceOffsetPercent
            => BalanceScenarioCount == 0 ? 0d : (double)(_balanceSum / BalanceScenarioCount);

        public double WorstBalanceOffsetPercent => (double)_worstBalance;

        public void Add(OptimizationInput input, OptimizationResult result)
        {
            ScenarioCount++;
            Placed += result.Placements.Count;
            Requested += input.Items.Sum(i => i.Quantity);
            _fillSum += result.FillRate;
            if (result.FillRate < _worstFill) _worstFill = result.FillRate;

            if (input.Criteria != LoadingPlanOptimizationCriteria.WeightBalance) return;

            var offset = Math.Abs(result.WeightBalanceOffsetX ?? 0m) + Math.Abs(result.WeightBalanceOffsetZ ?? 0m);

            BalanceScenarioCount++;
            _balanceSum += offset;
            if (offset > _worstBalance) _worstBalance = offset;
        }
    }
}
