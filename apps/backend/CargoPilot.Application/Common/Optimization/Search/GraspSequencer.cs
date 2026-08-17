using System.Diagnostics;
using CargoPilot.Application.Common.Models;
using CargoPilot.Application.Common.Optimization.WallBuilder;

namespace CargoPilot.Application.Common.Optimization.Search;

/// <summary>
/// GRASP (greedy randomized adaptive search procedure). GWCA'nin ikinci referansi.
///
/// Iki asamali tekrar: her turda (1) hacim-azalan siranin RASTGELE BOZULMUS bir
/// varyanti kurulur, (2) uzerinde takas tabanli yerel arama kosar. En iyi tur
/// saklanir.
///
/// GA'dan farki populasyon tutmamasi: her tur sifirdan baslar. Bu, arama uzayinin
/// farkli bolgelerini gormesini saglar ama birikimli ogrenme yoktur. Kiyasin
/// degeri tam olarak bu farkta — GWCA populasyon tasimanin bedelini hak ediyor mu.
///
/// Kodlama ve uygunluk GWCA/GA ile ORTAK (R-C22).
/// </summary>
internal static class GraspSequencer
{
    /// <summary>
    /// Insa asamasinda yeniden cekilen anahtarlarin orani. 0 baseline'i aynen
    /// tekrar eder, 1 her turda sifirdan rastgele sira kurar.
    ///
    /// Deger olculdu (BR1-BR7, 70 ornek, swaps=72):
    /// 0,30 → %86,46 · <b>0,45 → %86,58</b> · 0,60 → %86,30 · 0,80 → %86,07.
    /// Ilk deger 0,30'du ve hic taranmamisti.
    /// </summary>
    private const double Alpha = 0.45d;

    /// <summary>
    /// Yerel aramada bir turda denenecek takas sayisi. Butce duvar saati oldugu
    /// icin bu sayi, cabayi CESITLENDIRME (yeni tur kur) ile YOGUNLASTIRMA
    /// (ayni turda daha cok takas) arasinda paylastirir.
    ///
    /// Olculdu (BR1-BR7, 70 ornek, alpha=0,60):
    /// 4 → %85,39 · 12 → %85,78 · 32 → %86,11 · 48 → %86,21 ·
    /// <b>72 → %86,31</b> · 120 → %86,26 · 200 → %86,23.
    ///
    /// Ilk deger 12'ydi ve arama butcesinin buyuk kismini kullanmadan
    /// bitiriyordu; 72'de kosu butceyi tam kullaniyor.
    /// </summary>
    private const int SwapsPerRound = 72;

    internal static OptimizationResult Run(OptimizationInput input, CancellationToken cancellationToken)
    {
        var budget = input.SearchBudget ?? SearchBudget.Default;
        var clock = Stopwatch.StartNew();

        var expanded = SearchEvaluation.Expand(input);
        if (expanded.Count == 0) return WallBuilderPlacement.Run(input, cancellationToken);

        var seeds = SearchEvaluation.Seeds(input, expanded, cancellationToken);
        var evaluations = seeds.Count;

        var baseline = seeds.MinBy(s => s.Fitness)!;
        var best = baseline;
        var history = new List<double> { best.Fitness };
        var stall = 0;

        for (var round = 1; round <= budget.MaxIterations; round++)
        {
            cancellationToken.ThrowIfCancellationRequested();

            if (clock.ElapsedMilliseconds >= budget.MaxDurationMs) break;
            if (stall >= budget.StallIterations) break;

            var rng = SearchRandom.Derive(input.Seed, round, 0);

            // Insa: baseline anahtarlarini alpha kadar bozarak yeni bir sira kur.
            var keys = Perturb(baseline.Keys, rng, Alpha);
            var current = SearchEvaluation.Evaluate(input, expanded, keys, cancellationToken);
            evaluations++;

            // Yerel arama: rastgele iki anahtari takas et, iyilesirse kabul et.
            for (var swap = 0; swap < SwapsPerRound; swap++)
            {
                if (clock.ElapsedMilliseconds >= budget.MaxDurationMs) break;

                var neighbour = SearchEvaluation.Evaluate(
                    input, expanded, SwapTwo(current.Keys, expanded.Count, rng), cancellationToken);
                evaluations++;

                if (neighbour.Fitness < current.Fitness) current = neighbour;
            }

            var improved = current.Fitness < best.Fitness;
            if (improved) best = current;

            history.Add(best.Fitness);
            stall = improved ? 0 : stall + 1;
        }

        clock.Stop();
        var winner = SearchEvaluation.ApplyGuard(best, baseline);

        return winner.Result with
        {
            SearchStats = new SearchStats(
                history.Count - 1, evaluations, history, winner.Fitness < baseline.Fitness, clock.ElapsedMilliseconds),
        };
    }

    /// <summary>Anahtarlarin alpha oranindaki kismini yeniden cek.</summary>
    private static double[] Perturb(double[] source, SearchRandom rng, double alpha)
    {
        var keys = (double[])source.Clone();

        for (var i = 0; i < keys.Length; i++)
        {
            if (rng.Next() < alpha) keys[i] = rng.Next();
        }

        return keys;
    }

    /// <summary>
    /// Sirada iki kutunun yer degistirmesi. Takas YALNIZ vektorun ilk yarisinda
    /// yapilir: ikinci yari yonelim anahtarlaridir ve bir sira anahtariyla
    /// takaslanmalari komsuluk tanimini bozar — "iki kutunun sirasini degistir"
    /// hamlesi, yonelimi de rastgele bozan bir hamleye donusurdu.
    /// </summary>
    private static double[] SwapTwo(double[] source, int itemCount, SearchRandom rng)
    {
        var keys = (double[])source.Clone();
        if (itemCount < 2) return keys;

        var a = rng.NextInt(0, itemCount - 1);
        var b = rng.NextInt(0, itemCount - 1);
        (keys[a], keys[b]) = (keys[b], keys[a]);

        return keys;
    }
}
