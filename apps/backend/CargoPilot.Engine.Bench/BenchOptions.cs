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
    int DurationMinutes,
    string? ReportPath,
    SequencerKind Sequencer,
    int SearchMs,
    int Population,
    int Iterations,
    int MaxScenarios,
    int BrSet,
    decimal BrLoadRatio,
    decimal? DepthSlack,
    ConstraintCorpus.Kind Constraints,
    (double Volume, double Waste, double Contact, double BoxCount)? VcsWeights,
    string? BaselinePath,
    decimal? SupportThreshold,
    int Stall,
    string? ViewerPath,
    string Corpus)
{
    public const int ExitOk = 0;
    public const int ExitFailed = 1;
    public const int ExitUsage = 2;

    public IEnumerable<int> Seeds => Enumerable.Range(SeedFrom, SeedTo - SeedFrom + 1);

    public static BenchOptions Parse(string[] args)
    {
        ArgumentNullException.ThrowIfNull(args);

        string? viewerPath = null;
        var corpus = "br";
        var seedFrom = 1;
        var seedTo = 1;
        var count = 30;
        var repeat = 1;
        var concurrency = 1;
        var port = 5099;
        string? dump = null;
        var verbose = false;
        var durationMinutes = 5;
        string? reportPath = null;
        var sequencer = SequencerKind.Static;
        var searchMs = 2_000;
        var population = 20;
        var iterations = 40;
        var maxScenarios = 0;
        var brSet = -1;
        var brLoadRatio = 1m;
        decimal? depthSlack = null;
        var constraints = ConstraintCorpus.Kind.None;
        (double, double, double, double)? vcsWeights = null;
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
                case "--vcs":
                    vcsWeights = ParseVcs(value, arg);
                    break;
                case "--constraints":
                    constraints = ConstraintCorpus.Parse(value);
                    break;
                case "--depth-slack":
                    depthSlack = ParseDecimal(value, arg);
                    break;
                case "--load-ratio":
                    brLoadRatio = ParseDecimal(value, arg);
                    break;
                case "--set":
                    brSet = ParseInt(value, arg);
                    break;
                case "--corpus":
                    corpus = (value ?? "br").ToLowerInvariant() switch
                    {
                        "br" => "br",
                        "gercek" or "real" => "gercek",
                        _ => throw new ArgumentException($"{arg} br | gercek bekliyor."),
                    };
                    break;
                case "--viewer":
                    viewerPath = value;
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
            seedFrom, seedTo, count, repeat, Math.Max(1, concurrency), port, dump, verbose,
            Math.Max(1, durationMinutes), reportPath,
            sequencer, Math.Max(1, searchMs), Math.Max(2, population), Math.Max(1, iterations),
            Math.Max(0, maxScenarios),
            Math.Clamp(brSet, -1, 15),
            Math.Clamp(brLoadRatio, 0.05m, 1m),
            depthSlack,
            constraints,
            vcsWeights,
            baselinePath,
            supportThreshold,
            Math.Max(1, stall),
            viewerPath,
            corpus);
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
              --duration-min N soak kipinde kosu suresi, dakika (varsayilan 5)
              --report DOSYA   soak kipinde JSON rapor yolu
              --sequencer S    static | beam | grasp | ga | gwca (varsayilan static)
              --search-ms N    arama butcesi, ms (varsayilan 2000)
              --population N   populasyon (varsayilan 20)
              --iterations N   azami iterasyon (varsayilan 40)
              --stall N        bu kadar tur iyilesme yoksa dur (varsayilan 15)
              --max-scenarios N soak kipinde tam olarak N senaryo, br kipinde kume basina N ornek
              --set N          br kipinde tek kume (0-15). Verilmezse BR1-BR7 kosar.
                               BR0 tek tipli, BR8-BR15 guclu heterojen (30-100 tip);
                               ikisi de varsayilan kosuya girmez, sayiyi kiyaslanamaz yapardi.
              --load-ratio R   br kipinde yuku ozgun hacmin R katina indirir (varsayilan 1).
                               Kismi yuk rejimini olcer; orada doluluk degil YAYILMA
                               ve DILIM DOLULUGU kalite olcusudur (bkz. SpreadDiagnostics).
              --vcs A,B,C,D    VCS ustelleri: hacim,kayip,temas,kutu (or. 1,2,0.5,1).
                               Verilmezse dordu de 1 (kalibre edilmemis taban).
              --constraints K  br kipinde kisit ekler: none | lifo | fragile | stack | all.
                               Veri degismez, yalniz kisit alanlari doldurulur;
                               boylece kisitli/kisitsiz kosu birebir kiyaslanir.
              --depth-slack S  yuku ideal derinligin S katina toplar (or. 1,15).
                               Verilmezse URETIM VARSAYILANI kullanilir (1,05).
              --support N      asgari destek orani (varsayilan 0.80). YALNIZ OLCUM icin
              --corpus K       br | gercek (varsayilan br). "gercek", ROADEF/EURO 2022
                               (Renault) DAGILIMINDAN uretilmis korpustur: 13,5 m
                               dorse, paletli ambalaj, arac basina ~4 tip ve GERCEK
                               agirlik limiti. Gercek instance degil, gercek SEKIL.
              --viewer DOSYA   br kipinde her senaryonun planini JSON olarak yaz.
                               apps/algorithm-viewer/index.html bunu okur. Verilmezse
                               HICBIR ek islem yapilmaz, olcum hizi degismez.
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

    private static (double, double, double, double) ParseVcs(string? value, string flag)
    {
        var parts = (value ?? string.Empty).Split(',');
        if (parts.Length != 4) throw new ArgumentException($"{flag} A,B,C,D bekliyor.", nameof(flag));

        var n = parts.Select(p => double.Parse(p, CultureInfo.InvariantCulture)).ToArray();

        return (n[0], n[1], n[2], n[3]);
    }

    private static SequencerKind ParseSequencer(string? value, string flag)
        => value?.ToLowerInvariant() switch
        {
            "static" => SequencerKind.Static,
            "beam" => SequencerKind.Beam,
            "gwca" => SequencerKind.Gwca,
            "ga" => SequencerKind.Ga,
            "grasp" => SequencerKind.Grasp,
            _ => throw new ArgumentException($"{flag} static | beam | grasp | ga | gwca bekliyor.", nameof(flag)),
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
