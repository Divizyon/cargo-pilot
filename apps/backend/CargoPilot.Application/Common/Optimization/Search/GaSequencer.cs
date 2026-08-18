using System.Diagnostics;
using CargoPilot.Application.Common.Models;
using CargoPilot.Application.Common.Optimization.WallBuilder;

namespace CargoPilot.Application.Common.Optimization.Search;

/// <summary>
/// Random-key genetik algoritma. GWCA'nin referansi.
///
/// Neden var: GWCA'nin 3D konteyner yuklemeye uygulandigi yayimlanmis bir
/// calisma yok (DR-03). GA ise bu problemde olgun ve belgeli. GWCA ayni butce,
/// ayni yerlestirici ve ayni uygunluk fonksiyonu altinda GA'yi gecemezse
/// sequencer olarak GA kalir; Wall-Builder her hâlükârda kalir.
///
/// Kodlama GWCA ile ORTAK (<see cref="RandomKeySequence"/>): kiyas yalnizca
/// arama stratejisini olcer, kodlama farkini degil.
/// </summary>
internal static class GaSequencer
{
    /// <summary>Secilime giren birey sayisi (turnuva boyutu).</summary>
    private const int TournamentSize = 3;

    /// <summary>Anahtar basina mutasyon olasiligi.</summary>
    private const double MutationRate = 0.05d;

    /// <summary>Her nesilde dogrudan aktarilan en iyi birey orani.</summary>
    private const double ElitismRate = 0.10d;

    internal static OptimizationResult Run(OptimizationInput input, CancellationToken cancellationToken)
    {
        var budget = input.SearchBudget ?? SearchBudget.Default;
        var clock = Stopwatch.StartNew();

        var expanded = SearchEvaluation.Expand(input);
        if (expanded.Count == 0) return WallBuilderPlacement.Run(input, cancellationToken);

        var evaluations = 0;
        var population = SearchEvaluation.Seeds(input, expanded, cancellationToken);
        evaluations += population.Count;

        var rng = new SearchRandom(input.Seed);
        while (population.Count < budget.PopulationSize)
        {
            population.Add(SearchEvaluation.Evaluate(input, expanded, RandomKeys(rng, RandomKeySequence.KeyLength(expanded.Count)), cancellationToken));
            evaluations++;
        }

        var baseline = population.MinBy(p => p.Fitness)!;
        var best = baseline;
        var history = new List<double> { best.Fitness };
        var stall = 0;

        var eliteCount = Math.Max(1, (int)(budget.PopulationSize * ElitismRate));

        for (var generation = 1; generation <= budget.MaxIterations; generation++)
        {
            cancellationToken.ThrowIfCancellationRequested();

            if (clock.ElapsedMilliseconds >= budget.MaxDurationMs) break;
            if (stall >= budget.StallIterations) break;

            population.Sort((a, b) => a.Fitness.CompareTo(b.Fitness));

            var next = new List<SearchEvaluation.Candidate>(budget.PopulationSize);
            next.AddRange(population.Take(eliteCount));

            var improved = false;

            while (next.Count < budget.PopulationSize)
            {
                if (clock.ElapsedMilliseconds >= budget.MaxDurationMs) break;

                var local = SearchRandom.Derive(input.Seed, generation, next.Count);
                var parentA = Tournament(population, local);
                var parentB = Tournament(population, local);

                var child = SearchEvaluation.Evaluate(
                    input, expanded, Crossover(parentA.Keys, parentB.Keys, local), cancellationToken);
                evaluations++;

                next.Add(child);

                if (child.Fitness < best.Fitness)
                {
                    best = child;
                    improved = true;
                }
            }

            population = next;
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

    /// <summary>Turnuva secilimi: rastgele k birey arasindan en iyisi.</summary>
    private static SearchEvaluation.Candidate Tournament(
        List<SearchEvaluation.Candidate> population, SearchRandom rng)
    {
        var winner = population[rng.NextInt(0, population.Count - 1)];

        for (var i = 1; i < TournamentSize; i++)
        {
            var challenger = population[rng.NextInt(0, population.Count - 1)];
            if (challenger.Fitness < winner.Fitness) winner = challenger;
        }

        return winner;
    }

    /// <summary>
    /// Tekduze caprazlama + mutasyon. Random-key kodlamasinda caprazlama gecerli
    /// bir permutasyon uretme derdi tasimaz: hangi anahtar karisimi olursa olsun
    /// siralandiginda gecerli bir sira cikar. Ayrik kodlamalarda tamir gerekirdi.
    /// </summary>
    private static double[] Crossover(double[] a, double[] b, SearchRandom rng)
    {
        var child = new double[a.Length];

        for (var i = 0; i < child.Length; i++)
        {
            child[i] = rng.Next() < 0.5d ? a[i] : b[i];
            if (rng.Next() < MutationRate) child[i] = rng.Next();
        }

        return child;
    }

    private static double[] RandomKeys(SearchRandom rng, int length)
    {
        var keys = new double[length];
        for (var i = 0; i < length; i++) keys[i] = rng.Next();

        return keys;
    }
}
