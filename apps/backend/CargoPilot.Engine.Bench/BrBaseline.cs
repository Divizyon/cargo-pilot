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

    public sealed record SetResult(int Set, int Instances, decimal MeanFillPercent);

    public sealed record Report(
        string Strategy,
        string Sequencer,
        string Orientation,
        decimal MeanFillPercent,
        IReadOnlyList<SetResult> Sets);

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
        }

        if (improved)
        {
            Console.WriteLine("referans tazelenmeli: kazanc kaydedilmezse bir sonraki gerileme gec fark edilir.");
        }

        Console.WriteLine(ok ? "kapi: GECTI" : "kapi: KALDI");

        return ok;
    }

    /// <summary>
    /// Referans ancak AYNI yapilandirmayla kiyaslanabilir. Strateji ya da yonelim
    /// ucu degistiginde sayilar bambaska bir seyi olcer ve kiyas sessizce yanlis
    /// olurdu.
    /// </summary>
    private static bool Comparable(Report expected, Report actual)
    {
        if (expected.Strategy == actual.Strategy
            && expected.Sequencer == actual.Sequencer
            && expected.Orientation == actual.Orientation)
        {
            return true;
        }

        Console.Error.WriteLine(
            $"referans baska bir yapilandirmaya ait: {expected.Strategy}/{expected.Sequencer}/{expected.Orientation} " +
            $"!= {actual.Strategy}/{actual.Sequencer}/{actual.Orientation}.");

        return false;
    }
}
