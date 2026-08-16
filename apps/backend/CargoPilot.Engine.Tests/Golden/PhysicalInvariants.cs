using System.Globalization;
using CargoPilot.Application.Common.Models;
using CargoPilot.Domain.Enums;

namespace CargoPilot.Engine.Tests.Golden;

/// <summary>
/// Fiziksel geçerlilik (invariant) hesaplarının tek kaynağı: AABB çakışması,
/// %80 zemin desteği ve kırılgan kutunun üstünün boş kalması.
///
/// Hesaplar üretim kodundan (<c>PlacementValidator</c>) çağrılmaz, bilinçli
/// olarak bağımsız yazılır: doğrulanacak kuralı doğrulanan koddan okumak, kural
/// bozulduğunda testi de birlikte bozardı. Eşik ve karşılaştırma operatörü
/// üretimdekiyle birebir aynıdır (<c>&gt;= 0.80</c>).
///
/// Sahne sözleşmesi: santimetre, X=genişlik, Y=yükseklik, Z=uzunluk; kutu
/// konumu bottom-left-rear köşesidir.
/// </summary>
internal static class PhysicalInvariants
{
    /// <summary>PlacementValidator.HasSupport ile aynı eşik.</summary>
    public const decimal SupportThreshold = 0.80m;

    /// <summary>Hata mesajında en fazla kaç havada kalan kutunun ayrıntısı yazılır.</summary>
    private const int FloatingBoxReportLimit = 5;

    /// <summary>
    /// İki kutunun eksen hizalı kesişimi. Karşılaştırmalar kesin eşitsizliktir:
    /// yüzeylerin temas etmesi çakışma sayılmaz.
    /// </summary>
    public static bool Overlaps(PlacedItemResult a, PlacedItemResult b) =>
        a.X < b.X + b.Width && a.X + a.Width > b.X &&
        a.Y < b.Y + b.Height && a.Y + a.Height > b.Y &&
        a.Z < b.Z + b.Length && a.Z + a.Length > b.Z;

    /// <summary>
    /// Kutunun altındaki destek oranı. Zemindeki kutu (Y=0) ve sıfır taban alanı
    /// her zaman 1 döner. Yalnızca üst yüzeyi tam olarak kutunun tabanına denk
    /// gelen kutular destek sayılır; destek alanları toplanır.
    /// </summary>
    public static decimal SupportRatio(PlacedItemResult box, IEnumerable<PlacedItemResult> all)
    {
        if (box.Y == 0m)
        {
            return 1m;
        }

        var footprint = box.Width * box.Length;
        if (footprint == 0m)
        {
            return 1m;
        }

        var supported = 0m;
        foreach (var other in all)
        {
            if (ReferenceEquals(other, box) || other.Y + other.Height != box.Y)
            {
                continue;
            }

            supported += OverlapArea(box, other);
        }

        return supported / footprint;
    }

    /// <summary>Bir planın tüm fiziksel değişmezlerini doğrular.</summary>
    public static void AssertAll(string scenario, OptimizationInput input, OptimizationResult result)
    {
        AssertNoOverlap(scenario, result);
        AssertInsideVehicle(scenario, input, result);
        AssertSupported(scenario, result);
        AssertWeightCapacity(scenario, input, result);
        AssertQuantityConservation(scenario, input, result);
        AssertFragileTopsFree(scenario, input, result);
    }

    /// <summary>(a) Hiçbir kutu çifti çakışmaz.</summary>
    private static void AssertNoOverlap(string scenario, OptimizationResult result)
    {
        var placements = result.Placements;

        for (var i = 0; i < placements.Count; i++)
        {
            for (var j = i + 1; j < placements.Count; j++)
            {
                Assert.False(
                    Overlaps(placements[i], placements[j]),
                    string.Create(CultureInfo.InvariantCulture,
                        $"[{scenario}] {i}. ve {j}. kutu çakışıyor: {Describe(placements[i])} ile {Describe(placements[j])}."));
            }
        }
    }

    /// <summary>(b) Her kutu araç sınırları içinde kalır.</summary>
    private static void AssertInsideVehicle(string scenario, OptimizationInput input, OptimizationResult result)
    {
        for (var i = 0; i < result.Placements.Count; i++)
        {
            var box = result.Placements[i];

            var inside = box.X >= 0m && box.Y >= 0m && box.Z >= 0m
                         && box.X + box.Width <= input.VehicleWidth
                         && box.Y + box.Height <= input.VehicleHeight
                         && box.Z + box.Length <= input.VehicleLength;

            Assert.True(
                inside,
                string.Create(CultureInfo.InvariantCulture,
                    $"[{scenario}] {i}. kutu araç sınırlarını aşıyor: {Describe(box)}, araç {input.VehicleWidth}x{input.VehicleHeight}x{input.VehicleLength}."));
        }
    }

    /// <summary>
    /// (c) Y &gt; 0 olan her kutu en az %80 desteklidir. İhlaller tek tek değil
    /// toplu raporlanır: bir plandaki havada kalan kutu sayısı, tek bir örnekten
    /// çok daha bilgilendiricidir.
    /// </summary>
    private static void AssertSupported(string scenario, OptimizationResult result)
    {
        var floating = new List<string>();

        for (var i = 0; i < result.Placements.Count; i++)
        {
            var box = result.Placements[i];
            if (box.Y == 0m)
            {
                continue;
            }

            var ratio = SupportRatio(box, result.Placements);
            if (ratio >= SupportThreshold)
            {
                continue;
            }

            floating.Add(string.Create(CultureInfo.InvariantCulture,
                $"{i}. kutu destek oranı {ratio:0.0000} — {Describe(box)}"));
        }

        Assert.True(
            floating.Count == 0,
            string.Create(CultureInfo.InvariantCulture,
                $"[{scenario}] {floating.Count} kutu havada (gereken destek {SupportThreshold:0.00}): {string.Join(" | ", floating.Take(FloatingBoxReportLimit))}"));
    }

    /// <summary>(d) Yerleşen kutuların toplam ağırlığı araç kapasitesini aşmaz.</summary>
    private static void AssertWeightCapacity(string scenario, OptimizationInput input, OptimizationResult result)
    {
        var total = result.Placements.Sum(p => p.Weight);

        Assert.True(
            total <= input.VehicleMaxWeight,
            string.Create(CultureInfo.InvariantCulture,
                $"[{scenario}] yerleşen toplam ağırlık {total}, araç kapasitesi {input.VehicleMaxWeight}."));
    }

    /// <summary>(e) Korunum: yerleşen adet + yerleşemeyen adet = istenen adet.</summary>
    private static void AssertQuantityConservation(string scenario, OptimizationInput input, OptimizationResult result)
    {
        var requested = input.Items.Sum(i => i.Quantity);
        var placed = result.Placements.Count;
        var unplaced = result.UnplacedItems.Sum(u => u.Quantity);

        Assert.True(
            placed + unplaced == requested,
            string.Create(CultureInfo.InvariantCulture,
                $"[{scenario}] adet korunumu bozuldu: yerleşen {placed} + yerleşemeyen {unplaced} = {placed + unplaced}, istenen {requested}."));
    }

    /// <summary>(f) Kırılgan kutuların üstünde hiçbir kutu yoktur.</summary>
    private static void AssertFragileTopsFree(string scenario, OptimizationInput input, OptimizationResult result)
    {
        var fragileIds = input.Items
            .Where(i => i.FragilityType == FragilityType.Fragile)
            .Select(i => i.ItemId)
            .ToHashSet();

        if (fragileIds.Count == 0)
        {
            return;
        }

        foreach (var fragile in result.Placements.Where(p => fragileIds.Contains(p.ItemId)))
        {
            foreach (var above in result.Placements)
            {
                if (ReferenceEquals(above, fragile)
                    || above.Y < fragile.Y + fragile.Height
                    || OverlapArea(fragile, above) <= 0m)
                {
                    continue;
                }

                Assert.Fail(
                    string.Create(CultureInfo.InvariantCulture,
                        $"[{scenario}] kırılgan kutunun üstüne yük konmuş: kırılgan {Describe(fragile)}, üstteki {Describe(above)}."));
            }
        }
    }

    /// <summary>İki kutunun XZ düzlemindeki örtüşme alanı.</summary>
    private static decimal OverlapArea(PlacedItemResult a, PlacedItemResult b)
    {
        var overlapX = Math.Max(0m, Math.Min(a.X + a.Width, b.X + b.Width) - Math.Max(a.X, b.X));
        var overlapZ = Math.Max(0m, Math.Min(a.Z + a.Length, b.Z + b.Length) - Math.Max(a.Z, b.Z));

        return overlapX * overlapZ;
    }

    private static string Describe(PlacedItemResult box)
        => string.Create(CultureInfo.InvariantCulture,
            $"{box.ItemId} @({box.X},{box.Y},{box.Z}) {box.Width}x{box.Height}x{box.Length}");
}
