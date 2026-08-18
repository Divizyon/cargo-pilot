using System.Globalization;
using System.Security.Cryptography;
using System.Text;
using CargoPilot.Application.Common.Models;

namespace CargoPilot.Engine.Bench;

/// <summary>
/// Bir kosunun "anlamli" izdusumu: ayni girdi ayni plani uretti mi sorusunu tek
/// bir hex dizesine indirger.
///
/// Icine giren: senaryo kimligi, yerlesimlerin (itemId, rotation, x, y, z)
/// listesi ve yerlesemeyenlerin (itemId, reason) listesi — ikisi de kanonik
/// siralanir.
///
/// Disinda kalan: sure, plan kimligi, PlacementId, zaman damgasi, makine adi,
/// arama istatistikleri. Bunlar her kosuda degisir; ham rapor esitligi aranirsa
/// determinizm testi hicbir zaman yesil olmaz.
///
/// Bicim TypeScript tarafiyla ORTAKTIR (algorithm-test/suite/determinismDigest.ts).
/// Degistiren taraf digerini de degistirmek zorundadir; aksi halde iki kosucu
/// ayni plani farkli damgalar ve kiyas sessizce anlamsizlasir.
/// </summary>
public static class DeterminismDigest
{
    private const int FractionDigits = 6;

    /// <summary>Tek bir senaryonun kanonik metin izdusumu.</summary>
    public static string Canonical(string scenarioId, OptimizationResult result)
    {
        ArgumentNullException.ThrowIfNull(result);

        var lines = new List<string>(result.Placements.Count + result.UnplacedItems.Count + 1)
        {
            "scenario:" + scenarioId,
        };

        var placements = result.Placements
            .Select(p => string.Join(
                '|',
                "P",
                Id(p.ItemId),
                ((int)p.Rotation).ToString(CultureInfo.InvariantCulture),
                Number(p.X),
                Number(p.Y),
                Number(p.Z)))
            .OrderBy(line => line, StringComparer.Ordinal);

        var unplaced = result.UnplacedItems
            .Select(u => string.Join(
                '|',
                "U",
                Id(u.ItemId),
                ((int)u.Reason).ToString(CultureInfo.InvariantCulture),
                u.Quantity.ToString(CultureInfo.InvariantCulture)))
            .OrderBy(line => line, StringComparer.Ordinal);

        lines.AddRange(placements);
        lines.AddRange(unplaced);

        return string.Join('\n', lines);
    }

    /// <summary>Tek senaryonun damgasi.</summary>
    public static string OfScenario(string scenarioId, OptimizationResult result)
        => Hash(Canonical(scenarioId, result));

    /// <summary>
    /// Kosunun tamaminin damgasi. Senaryo damgalari kanonik siraya sokulur,
    /// boylece senaryolarin hangi sirada kosuldugu sonucu degistirmez.
    /// </summary>
    public static string OfRun(IEnumerable<(string ScenarioId, string Digest)> scenarios)
    {
        ArgumentNullException.ThrowIfNull(scenarios);

        var ordered = scenarios
            .Select(s => s.ScenarioId + ":" + s.Digest)
            .OrderBy(line => line, StringComparer.Ordinal);

        return Hash(string.Join('\n', ordered));
    }

    private static string Hash(string canonical)
        => Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(canonical))).ToLowerInvariant();

    private static string Id(Guid value) => value.ToString("D", CultureInfo.InvariantCulture);

    /// <summary>
    /// Ondaliklarin iki dilde ayni yazilmasi icin sabit bicim: en fazla alti
    /// basamak, sondaki sifirlar atilir. Motor santimetre calistigi icin degerler
    /// pratikte tam sayidir; bicim yine de yuvarlama farkina kapali tutulur.
    /// </summary>
    private static string Number(decimal value)
    {
        var rounded = Math.Round(value, FractionDigits, MidpointRounding.ToEven);
        var text = rounded.ToString("0.######", CultureInfo.InvariantCulture);

        return text == "-0" ? "0" : text;
    }
}
