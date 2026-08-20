using CargoPilot.Application.Common.Models;
using CargoPilot.Application.Common.Optimization.WallBuilder;
using CargoPilot.Domain.Enums;

namespace CargoPilot.Application.Common.Optimization.Search;

/// <summary>
/// Uc sequencer'in (GWCA, GA, GRASP) ortak degerlendirme katmani.
///
/// Kiyasin gecerli olmasi buna bagli: uc arama da AYNI yerlestiriciyi, AYNI
/// uygunluk fonksiyonunu ve AYNI tohum bireyleri kullanmak zorunda. Her biri
/// kendi maliyet formulunu tasisaydi olculen sey arama degil, formul farki olurdu
/// (docs/algorithm/01-kurallar.md R-C22).
/// </summary>
internal static class SearchEvaluation
{
    internal sealed record Candidate(double[] Keys, OptimizationResult Result, double Fitness);

    internal static List<OptimizationItemInput> Expand(OptimizationInput input)
        => [.. input.Items.SelectMany(i => Enumerable.Range(0, i.Quantity).Select(_ => i))];

    internal static Candidate Evaluate(
        OptimizationInput input,
        IReadOnlyList<OptimizationItemInput> expanded,
        double[] keys,
        CancellationToken cancellationToken)
    {
        var ordered = RandomKeySequence.Decode(expanded, keys, input.ClusterGroups);
        var decoder = RandomKeySequence.Decoder(keys, expanded.Count);
        var result = WallBuilderPlacement.Run(input, ordered, decoder, cancellationToken);

        return new Candidate(keys, result, Cost(input, result, expanded.Count));
    }

    /// <summary>
    /// Uygunluk maliyettir, dusuk kazanir; terimler SABIT sirada toplanir
    /// (R-C18). Sert kisit ihlali buraya giremez — Wall-Builder onlari zaten
    /// yerlestirmez, <c>Unplaced</c>'e duserler.
    /// </summary>
    internal static double Cost(OptimizationInput input, OptimizationResult result, int totalBoxes)
    {
        var unplaced = result.UnplacedItems.Sum(u => u.Quantity);
        var balance = (double)((result.WeightBalanceOffsetX ?? 0m) + (result.WeightBalanceOffsetZ ?? 0m)) / 100d;
        var balanceWeight = input.Criteria == LoadingPlanOptimizationCriteria.WeightBalance ? 5e4d : 5e2d;

        var cost = ((1d - (double)result.FillRate) * 1e6d)
                   + (totalBoxes > 0 ? (double)unplaced / totalBoxes * 1e5d : 0d)
                   + (balance * balanceWeight);

        return double.IsFinite(cost) ? cost : double.MaxValue;
    }

    /// <summary>
    /// Sezgisel tohumlar: hacim-azalan, taban-alani-azalan, agirlik-azalan.
    /// Butce disinda degerlendirilirler; arama bunlarin en iyisinden kotu bir
    /// sonuc donduremez (R-C16/R-C21) ve en az bir tam degerlendirme garantilidir.
    /// </summary>
    internal static List<Candidate> Seeds(
        OptimizationInput input,
        List<OptimizationItemInput> expanded,
        CancellationToken cancellationToken)
    {
        List<List<OptimizationItemInput>> orderings =
        [
            ItemOrdering.SortForGroupPlacement(expanded, input.Criteria, input.ClusterGroups, input.FragileLast),
            [.. expanded.OrderByDescending(i => i.Width * i.Length).ThenBy(i => i.ItemId)],
            [.. expanded.OrderByDescending(i => i.Weight).ThenBy(i => i.ItemId)],
        ];

        return [.. orderings.Select(o => Evaluate(input, expanded, RandomKeySequence.Encode(expanded, o), cancellationToken))];
    }

    /// <summary>
    /// Baseline garantisi (DR-09): secim uygunluk uzerinden yapilir ama doluluk
    /// ayrica kilitlidir — arama dengeyi iyilestirip dolulugu sessizce feda edemez.
    /// </summary>
    internal static Candidate ApplyGuard(Candidate best, Candidate baseline)
        => best.Fitness <= baseline.Fitness
           && best.Result.FillRate >= baseline.Result.FillRate - SearchBudget.FillRateGuard
            ? best
            : baseline;
}
