using System.Globalization;
using System.Text.Json;
using System.Text.Json.Serialization;

namespace CargoPilot.Engine.Bench;

/// <summary>
/// BR koşusunun makine okunur çıktısı ve referansla karşılaştırması.
///
/// Neden gerekiyor: bu oturumda kurulan ölçüm düzeneği elle koşulduğu sürece
/// çürür. Bir kapı olmadan doluluk düşüşü ancak birisi aynı komutu tekrar
/// koştuğunda fark edilir.
///
/// Kapı YALNIZCA statik sequencer ile anlamlıdır. Arama katmanının bütçesi duvar
/// saatidir (<see cref="Application.Common.Models.SearchBudget.MaxDurationMs"/>),
/// yani yavaş bir koşucu daha az iterasyon yapar ve sonuç makineye bağlı çıkar.
/// Statik yol saf hesaptır: aynı girdi her makinede bit birebir aynı sonucu verir.
/// </summary>
public static class BrBaseline
{
    /// <summary>
    /// İzin verilen düşüş, yüzde puanı. Statik yol deterministik olduğu için
    /// gerçek pay sıfırdır; bu değer yalnızca JSON yuvarlamasına karşı vardır.
    /// </summary>
    private const decimal TolerancePoints = 0.05m;

    private static readonly JsonSerializerOptions Options = new()
    {
        WriteIndented = true,
        DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull,
    };

    /// <summary>
    /// Izin verilen yayilma artisi. Doluluktan ayri bir pay gerekiyor cunku
    /// yayilma bir ORAN'dir (kullanilan/ideal uzunluk) ve yuzde puani degildir.
    /// Statik yol deterministik oldugu icin gercek pay yine sifirdir.
    /// </summary>
    private const double SpreadTolerance = 0.01d;

    /// <summary>
    /// Bir kumenin sonucu. Yayilma alanlari OPSIYONELDIR: tasan-yuk referanslari
    /// bu olcu eklenmeden once yazildi ve onlari gecersiz kilmamak gerekiyor.
    /// Iki tarafta da varsa kapiya girer, yoksa sessizce atlanir.
    /// </summary>
    public sealed record SetResult(
        int Set,
        int Instances,
        decimal MeanFillPercent,
        double? MeanSpreadRatio = null,
        double? MeanSliceUtilPercent = null,
        int? ZoneViolations = null,
        int? FragilityViolations = null,
        int? StackViolations = null,
        double? MeanBalanceX = null,
        double? MeanBalanceZ = null,
        double? WorstBalance = null);

    public sealed record Report(
        string Strategy,
        string Sequencer,
        string Orientation,
        decimal MeanFillPercent,
        IReadOnlyList<SetResult> Sets,
        decimal? LoadRatio = null,
        string? Corpus = null);

    public static void Write(string path, Report report)
    {
        ArgumentNullException.ThrowIfNull(report);

        var directory = Path.GetDirectoryName(path);
        if (!string.IsNullOrEmpty(directory)) Directory.CreateDirectory(directory);

        File.WriteAllText(path, JsonSerializer.Serialize(report, Options));
        Console.WriteLine(string.Create(CultureInfo.InvariantCulture, $"rapor: {path}"));
    }

    /// <summary>
    /// Referansla karşılaştırır. Gerileme varsa <c>false</c> döner; iyileşme
    /// kapıyı geçer ama referansın tazelenmesi gerektiği söylenir — yoksa kazanç
    /// sessizce yeni tabana dönüşmez ve bir sonraki gerileme geç fark edilir.
    /// </summary>
    public static bool Matches(string path, Report actual)
    {
        ArgumentNullException.ThrowIfNull(actual);

        if (!File.Exists(path))
        {
            Console.Error.WriteLine($"referans dosyasi yok: {path}");
            return false;
        }

        var expected = JsonSerializer.Deserialize<Report>(File.ReadAllText(path), Options);
        if (expected is null)
        {
            Console.Error.WriteLine($"referans okunamadi: {path}");
            return false;
        }

        if (!Comparable(expected, actual)) return false;

        var ok = true;
        var improved = false;

        foreach (var set in actual.Sets)
        {
            var reference = expected.Sets.FirstOrDefault(s => s.Set == set.Set);
            if (reference is null)
            {
                Console.Error.WriteLine($"referansta BR{set.Set} yok.");
                ok = false;
                continue;
            }

            if (reference.Instances != set.Instances)
            {
                Console.Error.WriteLine(string.Create(CultureInfo.InvariantCulture,
                    $"BR{set.Set} ornek sayisi farkli: referans {reference.Instances}, kosu {set.Instances}."));
                ok = false;
                continue;
            }

            var delta = set.MeanFillPercent - reference.MeanFillPercent;
            if (delta < -TolerancePoints)
            {
                Console.Error.WriteLine(string.Create(CultureInfo.InvariantCulture,
                    $"GERILEME BR{set.Set}: %{reference.MeanFillPercent:F2} -> %{set.MeanFillPercent:F2} ({delta:F2} puan)."));
                ok = false;
            }
            else if (delta > TolerancePoints)
            {
                improved = true;
                Console.WriteLine(string.Create(CultureInfo.InvariantCulture,
                    $"iyilesme BR{set.Set}: %{reference.MeanFillPercent:F2} -> %{set.MeanFillPercent:F2} (+{delta:F2} puan)."));
            }

            // Yayilma AYRI bir kapidir: sigan-yuk rejiminde doluluk sabittir ve
            // hicbir gerilemeyi gostermez, kotulesme yalnizca burada gorunur.
            if (reference.MeanSpreadRatio is not { } expectedSpread
                || set.MeanSpreadRatio is not { } actualSpread)
            {
                continue;
            }

            Violation("bosaltma yolu", reference.ZoneViolations, set.ZoneViolations, set.Set, ref ok);
            Violation("kirilganlik", reference.FragilityViolations, set.FragilityViolations, set.Set, ref ok);
            Violation("istif", reference.StackViolations, set.StackViolations, set.Set, ref ok);

            var spreadDelta = actualSpread - expectedSpread;
            if (spreadDelta > SpreadTolerance)
            {
                Console.Error.WriteLine(string.Create(CultureInfo.InvariantCulture,
                    $"GERILEME BR{set.Set} yayilma: x{expectedSpread:F3} -> x{actualSpread:F3} (+{spreadDelta:F3})."));
                ok = false;
            }
            else if (spreadDelta < -SpreadTolerance)
            {
                improved = true;
                Console.WriteLine(string.Create(CultureInfo.InvariantCulture,
                    $"iyilesme BR{set.Set} yayilma: x{expectedSpread:F3} -> x{actualSpread:F3} ({spreadDelta:F3})."));
            }
        }

        if (improved)
        {
            Console.WriteLine("referans tazelenmeli: kazanc kaydedilmezse bir sonraki gerileme gec fark edilir.");
        }

        Console.WriteLine(ok ? "kapi: GECTI" : "kapi: KALDI");

        return ok;
    }

    /// <summary>
    /// Kisit ihlali UCUNCU bir kapidir ve toleransi YOKTUR. Doluluk ve yayilma
    /// birer kalite olcusudur, ihlal ise bir HATA: sekiz sert kapi zaten
    /// uygulaniyor, sifir olmayan her sayi bir kusurdur.
    ///
    /// Kisitsiz kosuda alanlar bos gelir ve kapi sessizce atlanir.
    /// </summary>
    private static void Violation(string name, int? expected, int? actual, int set, ref bool ok)
    {
        if (expected is not { } before || actual is not { } after || after <= before) return;

        Console.Error.WriteLine(string.Create(CultureInfo.InvariantCulture,
            $"GERILEME BR{set} {name} ihlali: {before} -> {after}."));

        ok = false;
    }

    /// <summary>
    /// Referans ancak AYNI yapilandirmayla kiyaslanabilir. Strateji ya da yonelim
    /// ucu degistiginde sayilar bambaska bir seyi olcer ve kiyas sessizce yanlis
    /// olurdu.
    /// </summary>
    private static bool Comparable(Report expected, Report actual)
    {
        // Yuk orani da yapilandirmanin parcasidir: %25 kosusunu tam yuk
        // referansiyla kiyaslamak sessizce baska bir seyi olcerdi. Alan
        // eklenmeden once yazilmis referanslar tam yuktur.
        var expectedRatio = expected.LoadRatio ?? 1m;
        var actualRatio = actual.LoadRatio ?? 1m;

        // Korpus da yapilandirmanin parcasi: gercek korpus sayilarini BR
        // referansiyla kiyaslamak sessizce baska bir seyi olcerdi.
        var expectedCorpus = expected.Corpus ?? "br";
        var actualCorpus = actual.Corpus ?? "br";

        if (expected.Strategy == actual.Strategy
            && expected.Sequencer == actual.Sequencer
            && expected.Orientation == actual.Orientation
            && expectedRatio == actualRatio
            && expectedCorpus == actualCorpus)
        {
            return true;
        }

        Console.Error.WriteLine(string.Create(CultureInfo.InvariantCulture,
            $"referans baska bir yapilandirmaya ait: " +
            $"{expected.Strategy}/{expected.Sequencer}/{expected.Orientation}/{expectedCorpus}/yuk {expectedRatio:0.##} " +
            $"!= {actual.Strategy}/{actual.Sequencer}/{actual.Orientation}/{actualCorpus}/yuk {actualRatio:0.##}."));

        return false;
    }
}
