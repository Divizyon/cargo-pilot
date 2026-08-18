using CargoPilot.Application.Common.Models;
using CargoPilot.Application.Common.Optimization.WallBuilder;

namespace CargoPilot.Application.Common.Optimization.Search;

/// <summary>
/// Ileri bakisli isin aramasi (beam search) — Araya &amp; Riff 2014 cizgisi.
///
/// GRASP'tan farki karar birimidir. GRASP kutu SIRASINI arar ve yerlestiriciyi
/// hep ayni ayarla cagirir; olculdu ve doydu (DR-43: otuz kat butce +0,04
/// puan). Bu arama ise plani PARCA PARCA kurar ve her parcada
/// "bu karari verirsem sonu ne olur" diye sorar.
///
/// Doner dongu:
///   1. Elde birkac yarim plan (isin) vardir.
///   2. Her yarim plan icin birkac YERLESTIRICI AYARI denenir.
///   3. Her deneme once bir parca ilerletilir, sonra sonuna kadar acgozlulukle
///      tamamlanir — tamamlama yalnizca DEGERLENDIRME icindir, atilir.
///   4. Tamamlanmis dolulugu en iyi olan isin genisligi kadar yarim plan tutulur.
///
/// Bu, GRASP'in kromozomdaki tek decoder geninden (DR-29) su yonden ayrilir:
/// orada ayar TUM plan icin tektir, burada HER PARCA icin ayri secilebilir.
/// Bir duvar derin, sonraki sig olabilir.
///
/// Determinizm (R-C02) korunur: hicbir rastgelelik yoktur. Ayni girdi ayni
/// plani verir; esitlikte ayar sirasi karar verir.
/// </summary>
internal static class BeamSequencer
{
    /// <summary>
    /// Ayni anda tutulan yarim plan sayisi. OLCULDU (BR1-BR7, 12 ornek):
    /// 4 → %89,12 · 6 → %89,16 · <b>8 → %89,46</b> · 12 → %89,29 · 16 → %89,23.
    /// Genis isin daha cok dal degerlendirir ama her dala daha az sure duser;
    /// tepe sekizde.
    /// </summary>
    private const int BeamWidth = 8;

    /// <summary>
    /// Kac dallanma noktasi olacagi. Parca boyu <c>kutu sayisi / bu deger</c>
    /// olarak cikar, yani buyuk deger ince parca demektir.
    ///
    /// OLCULDU: 10 → %89,43 · <b>20 → %89,46</b> · 25 → %89,24 · 80 → %88,57.
    /// Cok ince parca sureyi dallanmaya harciyor ve tamamlamaya birakmiyor.
    ///
    /// <c>SearchBudget</c>'in <c>PopulationSize</c>/<c>MaxIterations</c>
    /// alanlari KULLANILMAZ: onlar GRASP icin ayarlanmis (20/100) ve beam'de
    /// olculen en kotu bolgeye denk geliyor. Beam'den yalnizca sure butcesi
    /// paylasilir.
    /// </summary>
    private const int SegmentCount = 20;

    /// <summary>
    /// Her parcada denenen yerlestirici ayarlari. Duvar derinligi ucu de
    /// (derin / notr / sig), cep sirasi ikisi de denenir — ikisi de olculdu ve
    /// SABIT hicbir degeri kazanmadi (DR-29), yani secim yuke baglidir.
    /// </summary>
    private static readonly DecoderKeys[] Variants =
    [
        new(0m, false),
        new(1m, false),
        new(0m, true),
    ];

    /// <summary>Bir parcada kac farkli "siradaki urun" denenir.</summary>
    private const int ItemChoices = 4;

    /// <summary>
    /// Siradaki urun kararini dallandirmak icin sira listesini yeniden kurar:
    /// once tuketilmis birimler (konum eslemesi bozulmasin diye), sonra SECILEN
    /// urunun kalanlari, sonra otekiler.
    ///
    /// Bu, aramanin asil dallanma noktasidir. Yerlestirici siradaki kutuyu
    /// alip cevresine ayni urunden blok orduguna gore (RaiseBlock), "siradaki
    /// urun hangisi" sorusu fiilen "bu bosluga hangi blok" sorusudur.
    /// </summary>
    private static (List<SequencedItem> Instances, bool[] Consumed) Prefer(
        List<SequencedItem> instances,
        bool[] consumed,
        Guid itemId)
    {
        var reordered = new List<SequencedItem>(instances.Count);
        var flags = new bool[instances.Count];

        for (var i = 0; i < instances.Count; i++)
        {
            if (!consumed[i]) continue;

            flags[reordered.Count] = true;
            reordered.Add(instances[i]);
        }

        for (var i = 0; i < instances.Count; i++)
        {
            if (!consumed[i] && instances[i].Item.ItemId == itemId) reordered.Add(instances[i]);
        }

        for (var i = 0; i < instances.Count; i++)
        {
            if (!consumed[i] && instances[i].Item.ItemId != itemId) reordered.Add(instances[i]);
        }

        return (reordered, flags);
    }

    /// <summary>
    /// Denenmeye deger "siradaki urun" adaylari: kalanlar arasindan hacimce en
    /// buyuk birkac tip. Buyuk hacim once denenir cunku doluluk hedefi odur;
    /// kimlik siralamasi esitlikte determinizmi saglar (R-C02).
    /// </summary>
    private static List<Guid> Choices(List<SequencedItem> instances, bool[] consumed)
    {
        var seen = new Dictionary<Guid, decimal>();

        for (var i = 0; i < instances.Count; i++)
        {
            if (consumed[i]) continue;

            var item = instances[i].Item;
            seen[item.ItemId] = item.Width * item.Height * item.Length;
        }

        return [.. seen
            .OrderByDescending(p => p.Value)
            .ThenBy(p => p.Key)
            .Take(ItemChoices)
            .Select(p => p.Key)];
    }

    internal static OptimizationResult Run(OptimizationInput input, CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(input);

        var expanded = input.Items.SelectMany(i => Enumerable.Range(0, i.Quantity).Select(_ => i));
        var instances = ItemOrdering
            .SortForGroupPlacement(expanded, input.Criteria, input.ClusterGroups)
            .Select(SequencedItem.Plain)
            .ToList();

        if (instances.Count == 0) return WallBuilderPlacement.Run(input, cancellationToken);

        var budget = input.SearchBudget ?? SearchBudget.Default;
        var clock = System.Diagnostics.Stopwatch.StartNew();

        // Taban: bugunku davranis. Arama bunun altina inemez (R-C16/R-C21).
        var baseline = WallBuilderPlacement.Run(input, instances, DecoderKeys.Neutral, cancellationToken);
        var best = baseline;

        // Kosu kimligi (DR-26): planin hangi aramadan ciktigi kaydedilir, yoksa
        // determinizm sozlesmesi (R-C02) kullanilamaz.
        var history = new List<double> { (double)baseline.FillRate };
        var evaluations = 1;
        var levels = 0;

        var beam = new List<(PlacementState State, List<SequencedItem> Order)>
        {
            (PlacementState.Fresh(input, instances.Count, null), instances),
        };

        var segment = Math.Max(1, instances.Count / SegmentCount);

        for (var placed = 0; placed < instances.Count; placed += segment)
        {
            cancellationToken.ThrowIfCancellationRequested();
            if (clock.ElapsedMilliseconds >= budget.MaxDurationMs) break;

            var target = placed + segment;
            var branches = new List<(PlacementState State, List<SequencedItem> Order, decimal Fill)>(
                beam.Count * Variants.Length * ItemChoices);

            foreach (var (state, order) in beam)
            {
                // Sure kontrolu UC dongude birden yapilir. Yalnizca en ictekinde
                // yapildiginda bir SEVIYE tamamen kosuyordu: 8 isin x 4 urun x
                // 3 ayar = 96 dal, her biri bir tamamlama demek. Olculdu, 2
                // saniyelik butce uretimde 4,5 saniyeye tasiyordu.
                if (clock.ElapsedMilliseconds >= budget.MaxDurationMs) break;

                foreach (var choice in Choices(order, state.Consumed))
                {
                    if (clock.ElapsedMilliseconds >= budget.MaxDurationMs) break;

                    var (preferred, flags) = Prefer(order, state.Consumed, choice);
                    var seed = state.WithConsumed(flags);

                    foreach (var variant in Variants)
                    {
                        if (clock.ElapsedMilliseconds >= budget.MaxDurationMs) break;

                        var advanced = WallBuilderPlacement.Run(
                            input, preferred, variant, seed.Clone(), cancellationToken, target).State;

                        // Tamamlama YALNIZCA olcumdur: dalin nereye varacagini
                        // gosterir, kendisi saklanmaz. Bu, "ileri bakis"in ta
                        // kendisidir — acgozlu secim burada bir sonuca baglanir.
                        var completed = WallBuilderPlacement.Run(
                            input, preferred, variant, advanced.Clone(), cancellationToken).Result;

                        evaluations++;
                        if (completed.FillRate > best.FillRate) best = completed;

                        branches.Add((advanced, preferred, completed.FillRate));
                    }
                }
            }

            if (branches.Count == 0) break;

            // Ilerlemeyen dallar isini tuketir: hicbir dal yeni kutu koymadiysa
            // arama bitmistir.
            if (branches.TrueForAll(b => b.State.Placements.Count <= placed)) break;

            levels++;
            history.Add((double)best.FillRate);

            branches.Sort(static (a, b) => b.Fill.CompareTo(a.Fill));

            beam.Clear();
            for (var i = 0; i < branches.Count && i < BeamWidth; i++)
            {
                beam.Add((branches[i].State, branches[i].Order));
            }
        }

        clock.Stop();

        return best with
        {
            SearchStats = new SearchStats(
                levels, evaluations, history, best.FillRate > baseline.FillRate, clock.ElapsedMilliseconds),
        };
    }
}
