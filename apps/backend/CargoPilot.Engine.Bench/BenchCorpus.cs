using System.Globalization;
using CargoPilot.Application.Common.Models;
using CargoPilot.Application.Common.Optimization;
using CargoPilot.Domain.Enums;

namespace CargoPilot.Engine.Bench;

/// <summary>
/// Tohumdan senaryo uretir. Uretilen sey dogrudan motorun girdisidir
/// (<see cref="OptimizationInput"/>): araya plan komutu, DTO ya da katalog
/// sorgusu girmez.
///
/// Uretici saftir — ayni tohum her zaman ayni listeyi verir. Kisitli urunlerin
/// senaryolara girme orani bilincli olarak yuksek tutulur; aksi halde kirilgan
/// ve istiflenemez dallar neredeyse hic kosulmuyordu.
/// </summary>
public static class BenchCorpus
{
    /// <summary>
    /// Uretim mantiginin surumu. Degisirse ayni tohum farkli liste verir;
    /// eski kosularla kiyas gecersizdir.
    /// </summary>
    public const int Version = 2;

    private const int ConstrainedPercent = 60;

    /// <summary>
    /// Istenen yukun arac kapasitesini asabilecegi ust sinir. 1'in uzerinde
    /// tutuluyor ki agirlik limiti dali da kosulsun; 23 kat asan senaryo ise
    /// motoru degil ureticinin sacmaligini olcer.
    /// </summary>
    private const decimal MaxOverload = 1.25m;
    private const int MaxDistinctItems = 5;
    private const int MaxTotalBoxes = 500;

    private static readonly LoadingPlanOptimizationCriteria[] Criteria =
    [
        LoadingPlanOptimizationCriteria.VolumeFirst,
        LoadingPlanOptimizationCriteria.WeightBalance,
        LoadingPlanOptimizationCriteria.Lifo,
    ];

    private static readonly IReadOnlyList<BenchCatalog.BenchItem> ConstrainedItems =
        [.. BenchCatalog.Items.Where(IsConstrained)];

    private static readonly IReadOnlyList<BenchCatalog.BenchItem> PlainItems =
        [.. BenchCatalog.Items.Where(item => !IsConstrained(item))];

    public sealed record BenchScenario(string Id, OptimizationInput Input);

    /// <summary>
    /// Tek tohumdan <paramref name="count"/> senaryo; her senaryo uc kriterin
    /// biriyle. Kimlik tohum + sira numarasi tasir, boylece bozuk bir vaka
    /// rapordan tek satirla geri kurulur.
    /// </summary>
    public static List<BenchScenario> Generate(int seed, int count)
    {
        var rng = new BenchRng(seed);
        var scenarios = new List<BenchScenario>(count);

        for (var index = 1; index <= count; index++)
        {
            var criteria = Criteria[(index - 1) % Criteria.Length];
            scenarios.Add(new BenchScenario(
                string.Create(CultureInfo.InvariantCulture, $"s{seed}-{index:D4}-k{(int)criteria}"),
                BuildInput(rng, criteria)));
        }

        return scenarios;
    }

    private static OptimizationInput BuildInput(BenchRng rng, LoadingPlanOptimizationCriteria criteria)
    {
        var vehicle = rng.Pick(BenchCatalog.Vehicles);
        var forceConstrained = rng.NextInt(1, 100) <= ConstrainedPercent;

        var pool = forceConstrained && ConstrainedItems.Count > 0
            ? Interleave(rng.Shuffle(ConstrainedItems), rng.Shuffle(PlainItems))
            : rng.Shuffle(BenchCatalog.Items);

        // Araca hicbir donuste sigmayan urun senaryodan cikarilir. Bunlar gecerli
        // bir motor davranisi (InsufficientSpace) ama uretilmis senaryoda deger
        // katmiyor: doluluk ortalamasini bastiriyor ve olculen sey motorun
        // yerlestirme kalitesi olmaktan cikiyor. Sigmayan kutu vakasi curated
        // fixture'in isi (SC-03).
        var fitting = pool.Where(item => FitsInVehicle(item, vehicle)).ToList();
        if (fitting.Count == 0) fitting = pool;

        var distinct = rng.NextInt(1, Math.Min(MaxDistinctItems, fitting.Count));
        var chosen = fitting.Take(distinct).ToList();

        // Grup sayisi LIFO bolgelerini tetikleyecek kadar; her grup bir bosaltma
        // sirasi alir ve gruplu senaryolarda kumeleme acik kalir.
        var groupCount = criteria == LoadingPlanOptimizationCriteria.Lifo
            ? rng.NextInt(2, 3)
            : rng.NextInt(0, 2);

        var targetFill = 0.25m + (decimal)rng.Next() * 1.0m;
        var vehicleVolume = vehicle.Width * vehicle.Height * vehicle.Length;
        var averageVolume = chosen.Sum(i => i.Width * i.Height * i.Length) / chosen.Count;
        var targetBoxes = averageVolume > 0m ? (int)(vehicleVolume * targetFill / averageVolume) : chosen.Count;
        var totalBoxes = Math.Clamp(targetBoxes, chosen.Count, MaxTotalBoxes);

        // Hacim hedefi agirligi gormuyor: 800 kg'lik araca 18 ton yuk isteyen
        // senaryo uretilebiliyordu. Adet kapasiteye gore olceklenir.
        var averageWeight = chosen.Sum(i => i.Weight) / chosen.Count;
        if (averageWeight > 0m)
        {
            var maxByWeight = (int)(vehicle.MaxWeight * MaxOverload / averageWeight);
            totalBoxes = Math.Clamp(Math.Min(totalBoxes, maxByWeight), chosen.Count, MaxTotalBoxes);
        }

        var items = new List<OptimizationItemInput>(chosen.Count);
        var remaining = totalBoxes;

        for (var i = 0; i < chosen.Count; i++)
        {
            var isLast = i == chosen.Count - 1;
            var share = isLast ? remaining : Math.Max(1, remaining / (chosen.Count - i));
            remaining -= share;

            var groupNumber = groupCount > 0 ? rng.NextInt(1, groupCount) : 0;
            var groupId = groupNumber > 0 ? BenchCatalog.StableId(BenchCatalog.GroupCode(groupNumber)) : (Guid?)null;

            items.Add(BenchCatalog.ToInput(chosen[i], Math.Max(1, share), groupId, groupNumber > 0 ? groupNumber : null));
        }

        return new OptimizationInput(
            VehicleWidth: vehicle.Width,
            VehicleHeight: vehicle.Height,
            VehicleLength: vehicle.Length,
            VehicleMaxWeight: vehicle.MaxWeight,
            Items: items,
            Criteria: criteria,
            LoadingType: vehicle.LoadingType,
            ClusterGroups: true,
            Modules: null,
            FillFromMaxX: vehicle.FillFromMaxX);
    }

    /// <summary>Kisitli urunler basa, sade urunler araya; secim ilk N'i alir.</summary>
    private static List<BenchCatalog.BenchItem> Interleave(
        List<BenchCatalog.BenchItem> first,
        List<BenchCatalog.BenchItem> second)
    {
        var merged = new List<BenchCatalog.BenchItem>(first.Count + second.Count);
        var max = Math.Max(first.Count, second.Count);

        for (var i = 0; i < max; i++)
        {
            if (i < first.Count) merged.Add(first[i]);
            if (i < second.Count) merged.Add(second[i]);
        }

        return merged;
    }

    /// <summary>
    /// Urun bu araca izin verilen donuslerden biriyle sigiyor mu. Yonelim listesi
    /// motorun kendi kaynagindan (<see cref="PlacementValidator.GetOrientations"/>)
    /// gelir; ureticide ikinci bir rotasyon tablosu tutmak iki kaynak yaratirdi.
    /// </summary>
    private static bool FitsInVehicle(BenchCatalog.BenchItem item, BenchCatalog.BenchVehicle vehicle)
    {
        var probe = BenchCatalog.ToInput(item, 1);

        foreach (var (width, height, length, _) in PlacementValidator.GetOrientations(probe))
        {
            if (width <= vehicle.Width && height <= vehicle.Height && length <= vehicle.Length)
                return true;
        }

        return false;
    }

    private static bool IsConstrained(BenchCatalog.BenchItem item)
        => !item.IsStackable
           || item.MaxStackCount > 0
           || item.MaxWeightOnTop > 0m
           || item.FragilityType != FragilityType.NonFragile
           || item.AllowedRotations != AllowedRotations.All
           || item.StackGroup is not null;

    public static string Signature(int seed, int count)
        => string.Create(
            CultureInfo.InvariantCulture,
            $"seed={seed};count={count};gen={Version};catalog={BenchCatalog.Version}");
}
