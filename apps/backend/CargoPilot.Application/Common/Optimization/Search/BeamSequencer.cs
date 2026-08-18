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
    /// Isin genisligi <c>SearchBudget.PopulationSize</c>'dan gelir: iki kavram
    /// ayni seydir — ayni anda tutulan aday cozum sayisi.
    /// </summary>
    private static int BeamWidth(SearchBudget budget) => Math.Max(1, budget.PopulationSize);

    /// <summary>
    /// Bir parcada kac kutu yerlestirilir. Kucuk parca daha cok dallanma
    /// noktasi, yani daha ince arama ve daha cok sure demektir;
    /// <c>MaxIterations</c> bunu ters yonde tasir (cok iterasyon = ince parca).
    /// </summary>
    private static int SegmentSize(SearchBudget budget, int instanceCount)
        => Math.Max(1, instanceCount / Math.Max(1, budget.MaxIterations));

    /// <summary>
    /// Her parcada denenen yerlestirici ayarlari. Duvar derinligi ucu de
    /// (derin / notr / sig), cep sirasi ikisi de denenir — ikisi de olculdu ve
    /// SABIT hicbir degeri kazanmadi (DR-29), yani secim yuke baglidir.
    /// </summary>
    private static readonly DecoderKeys[] Variants =
    [
        new(0m, false),
        new(-1m, false),
        new(1m, false),
        new(0m, true),
        new(-1m, true),
        new(1m, true),
    ];

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
        var best = WallBuilderPlacement.Run(input, instances, DecoderKeys.Neutral, cancellationToken);

        var beam = new List<PlacementState> { PlacementState.Fresh(input, instances.Count, null) };

        var width = BeamWidth(budget);
        var segment = SegmentSize(budget, instances.Count);

        for (var placed = 0; placed < instances.Count; placed += segment)
        {
            cancellationToken.ThrowIfCancellationRequested();
            if (clock.ElapsedMilliseconds >= budget.MaxDurationMs) break;

            var target = placed + segment;
            var branches = new List<(PlacementState State, decimal Fill)>(beam.Count * Variants.Length);

            foreach (var state in beam)
            {
                foreach (var variant in Variants)
                {
                    if (clock.ElapsedMilliseconds >= budget.MaxDurationMs) break;

                    var advanced = WallBuilderPlacement.Run(
                        input, instances, variant, state.Clone(), cancellationToken, target).State;

                    // Tamamlama YALNIZCA olcumdur: dalin nereye varacagini
                    // gosterir, kendisi saklanmaz. Bu, "ileri bakis"in ta
                    // kendisidir — acgozlu secim burada bir sonuca baglanir.
                    var completed = WallBuilderPlacement.Run(
                        input, instances, variant, advanced.Clone(), cancellationToken).Result;

                    if (completed.FillRate > best.FillRate) best = completed;

                    branches.Add((advanced, completed.FillRate));
                }
            }

            if (branches.Count == 0) break;

            // Ilerlemeyen dallar isini tuketir: hicbir dal yeni kutu koymadiysa
            // arama bitmistir.
            if (branches.TrueForAll(b => b.State.Placements.Count <= placed)) break;

            branches.Sort(static (a, b) => b.Fill.CompareTo(a.Fill));

            beam.Clear();
            for (var i = 0; i < branches.Count && i < width; i++) beam.Add(branches[i].State);
        }

        return best;
    }
}
