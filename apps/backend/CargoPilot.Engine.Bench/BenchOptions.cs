using System.Globalization;
using CargoPilot.Domain.Enums;

namespace CargoPilot.Engine.Bench;

/// <summary>
/// Komut satiri secenekleri. Bilinmeyen bayrak sessizce yutulmaz: yanlis yazilan
/// bir bayrak varsayilanla kosarsa olcum sessizce baska bir seyi olcer.
/// </summary>
public sealed record BenchOptions(
    int SeedFrom,
    int SeedTo,
    int Count,
    int Repeat,
    int Concurrency,
    int Port,
    string? DumpDirectory,
    bool Verbose,
    PlacementStrategy Strategy,
    int DurationMinutes,
    string? ReportPath,
    SequencerKind Sequencer,
    int SearchMs,
    int Population,
    int Iterations,
    int MaxScenarios,
    int BrSet,
    BrCorpus.OrientationMode BrOrientation,
    string? BaselinePath,
    decimal? SupportThreshold,
    int Stall)
{
    public const int ExitOk = 0;
    public const int ExitFailed = 1;
    public const int ExitUsage = 2;

    public IEnumerable<int> Seeds => Enumerable.Range(SeedFrom, SeedTo - SeedFrom + 1);

    public static BenchOptions Parse(string[] args)
    {
        ArgumentNullException.ThrowIfNull(args);

        var seedFrom = 1;
        var seedTo = 1;
        var count = 30;
        var repeat = 1;
        var concurrency = 1;
        var port = 5099;
        string? dump = null;
        var verbose = false;
        var strategy = PlacementStrategy.WallBuilder;
        var durationMinutes = 5;
        string? reportPath = null;
        var sequencer = SequencerKind.Static;
        var searchMs = 2_000;
        var population = 20;
        var iterations = 40;
        var maxScenarios = 0;
        var brSet = 0;
        var brOrientation = BrCorpus.OrientationMode.Strict;
        string? baselinePath = null;
        decimal? supportThreshold = null;
        var stall = 15;

        for (var i = 0; i < args.Length; i++)
        {
            var arg = args[i];
            if (!arg.StartsWith("--", StringComparison.Ordinal)) continue;

            var value = i + 1 < args.Length && !args[i + 1].StartsWith("--", StringComparison.Ordinal)
                ? args[i + 1]
                : null;

            switch (arg)
            {
                case "--seed":
                    seedFrom = seedTo = ParseInt(value, arg);
                    break;
                case "--seed-range":
                    (seedFrom, seedTo) = ParseRange(value, arg);
                    break;
                case "--count":
                    count = ParseInt(value, arg);
                    break;
                case "--repeat":
                    repeat = ParseInt(value, arg);
                    break;
                case "--concurrency":
                    concurrency = ParseInt(value, arg);
                    break;
                case "--port":
                    port = ParseInt(value, arg);
                    break;
                case "--dump":
                    dump = value;
                    break;
                case "--verbose":
                    verbose = true;
                    break;
                case "--strategy":
                    strategy = ParseStrategy(value, arg);
                    break;
                case "--duration-min":
                    durationMinutes = ParseInt(value, arg);
                    break;
                case "--report":
                    reportPath = value;
                    break;
                case "--sequencer":
                    sequencer = ParseSequencer(value, arg);
                    break;
                case "--search-ms":
                    searchMs = ParseInt(value, arg);
                    break;
                case "--population":
                    population = ParseInt(value, arg);
                    break;
                case "--iterations":
                    iterations = ParseInt(value, arg);
                    break;
                case "--max-scenarios":
                    maxScenarios = ParseInt(value, arg);
                    break;
                case "--set":
                    brSet = ParseInt(value, arg);
                    break;
                case "--orientation":
                    brOrientation = ParseOrientation(value, arg);
                    break;
                case "--baseline":
                    baselinePath = value;
                    break;
                case "--support":
                    supportThreshold = ParseDecimal(value, arg);
                    break;
                case "--stall":
                    stall = ParseInt(value, arg);
                    break;
                case "--help":
                case "-h":
                    break;
                default:
                    throw new ArgumentException($"Bilinmeyen bayrak: {arg}", nameof(args));
            }
        }

        return new BenchOptions(
            seedFrom, seedTo, count, repeat, Math.Max(1, concurrency), port, dump, verbose, strategy,
            Math.Max(1, durationMinutes), reportPath,
            sequencer, Math.Max(1, searchMs), Math.Max(2, population), Math.Max(1, iterations),
            Math.Max(0, maxScenarios),
            Math.Clamp(brSet, 0, 7),
            brOrientation,
            baselinePath,
            supportThreshold,
            Math.Max(1, stall));
    }

    public static int PrintUsage()
    {
        Console.WriteLine("""
            Kullanim: dotnet run --project CargoPilot.Engine.Bench -- [kip] [bayraklar]

            Kipler:
              bench            Sabit korpusu kosar (varsayilan)
              br               BR1-BR7 kiyas kumelerini kosar (literaturle kiyas)
              soak             Durmadan yeni senaryo uretip hacim kalitesini olcer
              serve            POST /engine/run ucunu acar

            Bayraklar:
              --seed N         Tek tohum (varsayilan 1)
              --seed-range a..b  Tohum araligi
              --count N        Tohum basina senaryo sayisi (varsayilan 30)
              --repeat N       Ayni kosuyu N kez tekrarla, damga farkini ara
              --concurrency N  Es zamanli senaryo (olcumde 1 kalmali)
              --port N         serve kipinde dinlenecek port (varsayilan 5099)
              --dump DIZIN     Uretilen girdileri JSON olarak yaz
              --verbose        Senaryo bazinda satir bas
              --strategy S     greedy | wallbuilder (varsayilan greedy)
              --duration-min N soak kipinde kosu suresi, dakika (varsayilan 5)
              --report DOSYA   soak kipinde JSON rapor yolu
              --sequencer S    static | gwca | ga | grasp (varsayilan static)
              --search-ms N    arama butcesi, ms (varsayilan 2000)
              --population N   populasyon (varsayilan 20)
              --iterations N   azami iterasyon (varsayilan 40)
              --stall N        bu kadar tur iyilesme yoksa dur (varsayilan 15)
              --max-scenarios N soak kipinde tam olarak N senaryo, br kipinde kume basina N ornek
              --set N          br kipinde tek kume (1-7); 0 ise hepsi (varsayilan 0)
              --orientation S  br kipinde strict | free (varsayilan strict, alt sinir)
              --support N      asgari destek orani (varsayilan 0.80). YALNIZ OLCUM icin
              --baseline DOSYA br kipinde referansla kiyasla; gerileme varsa hata koduyla cik
              --report DOSYA   br kipinde JSON rapor yolu (soak kipinde de gecerli)
            """);

        return ExitOk;
    }

    public static int Unknown(string mode)
    {
        Console.Error.WriteLine($"Bilinmeyen kip: {mode}");
        PrintUsage();

        return ExitUsage;
    }

    private static BrCorpus.OrientationMode ParseOrientation(string? value, string flag)
        => value?.ToLowerInvariant() switch
        {
            "strict" => BrCorpus.OrientationMode.Strict,
            "free" => BrCorpus.OrientationMode.Free,
            _ => throw new ArgumentException($"{flag} strict | free bekliyor.", nameof(flag)),
        };

    private static SequencerKind ParseSequencer(string? value, string flag)
        => value?.ToLowerInvariant() switch
        {
            "static" => SequencerKind.Static,
            "gwca" => SequencerKind.Gwca,
            "ga" => SequencerKind.Ga,
            "grasp" => SequencerKind.Grasp,
            _ => throw new ArgumentException($"{flag} static | gwca | ga | grasp bekliyor.", nameof(flag)),
        };

    private static PlacementStrategy ParseStrategy(string? value, string flag)
        => value?.ToLowerInvariant() switch
        {
            "greedy" => PlacementStrategy.Greedy,
            "wallbuilder" or "wall-builder" or "wall" => PlacementStrategy.WallBuilder,
            _ => throw new ArgumentException($"{flag} 'greedy' ya da 'wallbuilder' bekliyor.", nameof(flag)),
        };

    private static decimal ParseDecimal(string? value, string flag)
        => decimal.TryParse(value, NumberStyles.Number, CultureInfo.InvariantCulture, out var parsed)
            ? parsed
            : throw new ArgumentException($"{flag} ondalik sayi bekliyor.", nameof(flag));

    private static int ParseInt(string? value, string flag)
        => int.TryParse(value, NumberStyles.Integer, CultureInfo.InvariantCulture, out var parsed)
            ? parsed
            : throw new ArgumentException($"{flag} sayi bekliyor.", nameof(flag));

    private static (int From, int To) ParseRange(string? value, string flag)
    {
        var parts = value?.Split("..", StringSplitOptions.RemoveEmptyEntries) ?? [];
        if (parts.Length != 2) throw new ArgumentException($"{flag} 'a..b' bicimi bekliyor.", nameof(flag));

        var from = ParseInt(parts[0], flag);
        var to = ParseInt(parts[1], flag);

        return from <= to ? (from, to) : (to, from);
    }
}
