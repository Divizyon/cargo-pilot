using System.Diagnostics;
using CargoPilot.Application.Common.Models;
using CargoPilot.Application.Common.Optimization.WallBuilder;
using CargoPilot.Domain.Enums;

namespace CargoPilot.Application.Common.Optimization.Search;

/// <summary>
/// GWCA (Great Wall Construction Algorithm, Guan vd. 2023) ile yerlestirme
/// sirasi aramasi.
///
/// Neden arama: olcum, yerlestirme politikasinin da elle yazilan siralamanin da
/// tavana vurdugunu gosterdi (bkz. ALGORITMA-GELISTIRME-LOG.md v6-v9). Konteynerin
/// bolunmus halinden uretilen senaryolarda %100 veren bir sira VARDIR ama her
/// senaryoda farklidir; sabit bir kural onu bulamaz.
///
/// GWCA'nin 3D konteyner yuklemeye uygulandigi yayimlanmis bir calisma YOKTUR
/// (DR-03). Bu yuzden GA ve GRASP referans olarak yanında durur ve GWCA
/// kazanamazsa yerini birakir; Wall-Builder her hâlükârda kalir.
///
/// Populasyon her iterasyonda uygunluga gore siralanir; en iyi uc birey liderdir
/// (basmuhendis, komutan, usta isci) ve her bireye rastgele bir rol atanir.
/// </summary>
internal static class GwcaSequencer
{
    /// <summary>Eleme orani: en kotu bireyler her turda yeniden baslatilir.</summary>
    private const double EliminationRate = 0.10d;

    /// <summary>Isci adiminin Gama sekil ve olcek parametreleri.</summary>
    private const double GammaShape = 2d;
    private const double GammaScale = 2d;

    internal static OptimizationResult Run(OptimizationInput input, CancellationToken cancellationToken)
    {
        var budget = input.SearchBudget ?? SearchBudget.Default;
        var clock = Stopwatch.StartNew();

        var expanded = input.Items.SelectMany(i => Enumerable.Range(0, i.Quantity).Select(_ => i)).ToList();
        if (expanded.Count == 0) return WallBuilderPlacement.Run(input, cancellationToken);

        var evaluations = 0;
        var history = new List<double>(budget.MaxIterations + 1);

        // ── Tohum bireyler ────────────────────────────────────────────────────
        // Sezgisel siralar populasyona girer ve BUTCE DISINDA degerlendirilir:
        // arama hicbir zaman tohumdan kotu bir sonuc donduremez (R-C21/DR-09),
        // bu yuzden en az bir tam degerlendirme garantilidir (RK-04).
        var seeds = SeedOrderings(expanded, input.Criteria, input.ClusterGroups);
        var population = new List<Individual>(budget.PopulationSize);

        foreach (var seed in seeds)
        {
            var keys = RandomKeySequence.Encode(expanded, seed);
            population.Add(Evaluate(input, expanded, keys, cancellationToken, ref evaluations));
        }

        var rng = new SearchRandom(input.Seed);
        while (population.Count < budget.PopulationSize)
        {
            var keys = new double[RandomKeySequence.KeyLength(expanded.Count)];
            for (var i = 0; i < keys.Length; i++) keys[i] = rng.Next();

            population.Add(Evaluate(input, expanded, keys, cancellationToken, ref evaluations));
        }

        var best = population.MinBy(p => p.Fitness)!;
        var baseline = best;
        history.Add(best.Fitness);

        var velocities = new double[budget.PopulationSize][];
        for (var i = 0; i < velocities.Length; i++) velocities[i] = new double[RandomKeySequence.KeyLength(expanded.Count)];

        var personalBest = population.Select(p => (double[])p.Keys.Clone()).ToList();
        var stall = 0;

        // ── Ana dongu ─────────────────────────────────────────────────────────
        for (var iteration = 1; iteration <= budget.MaxIterations; iteration++)
        {
            cancellationToken.ThrowIfCancellationRequested();

            if (clock.ElapsedMilliseconds >= budget.MaxDurationMs) break;
            if (stall >= budget.StallIterations) break;

            population.Sort((a, b) => a.Fitness.CompareTo(b.Fitness));
            var leaderEngineer = population[0];
            var leaderCommander = population[Math.Min(1, population.Count - 1)];
            var leaderWorker = population[Math.Min(2, population.Count - 1)];

            var improved = false;

            for (var index = 0; index < population.Count; index++)
            {
                if (clock.ElapsedMilliseconds >= budget.MaxDurationMs) break;

                // Her birey kendi alt-uretecinden ceker: paralel degerlendirmede
                // cagri sirasi degisse bile ayni sayilar uretilir.
                var local = SearchRandom.Derive(input.Seed, iteration, index);
                var role = local.NextInt(0, 2);

                var keys = role switch
                {
                    0 => Engineer(population[index], leaderEngineer, velocities[index], local),
                    1 => Soldier(population[index], population[local.NextInt(0, population.Count - 1)], leaderCommander, velocities[index], local),
                    _ => Worker(population[index], leaderWorker, personalBest[index], iteration, local),
                };

                var candidate = Evaluate(input, expanded, keys, cancellationToken, ref evaluations);

                if (candidate.Fitness < population[index].Fitness)
                {
                    personalBest[index] = (double[])candidate.Keys.Clone();
                    population[index] = candidate;
                }

                if (candidate.Fitness < best.Fitness)
                {
                    best = candidate;
                    improved = true;
                }
            }

            // Proje yoneticisi verimsiz iscileri eler: en kotu bireyler yeniden
            // baslatilir, boylece populasyon yerel bir cukurda tikanmaz.
            Eliminate(input, expanded, population, personalBest, velocities, iteration, cancellationToken, ref evaluations);

            history.Add(best.Fitness);
            stall = improved ? 0 : stall + 1;
        }

        clock.Stop();

        // ── Baseline garantisi (DR-09) ────────────────────────────────────────
        // Secim uygunluk uzerinden yapilir, ama doluluk ayrica kilitlidir: arama
        // dengeyi iyilestirip dolulugu sessizce feda edemez.
        var winner = best.Fitness <= baseline.Fitness && best.Result.FillRate >= baseline.Result.FillRate - SearchBudget.FillRateGuard
            ? best
            : baseline;

        var stats = new SearchStats(
            Iterations: history.Count - 1,
            Evaluations: evaluations,
            BestCostHistory: history,
            SearchImproved: winner.Fitness < baseline.Fitness,
            DurationMs: clock.ElapsedMilliseconds);

        return winner.Result with { SearchStats = stats };
    }

    private static void Eliminate(
        OptimizationInput input,
        List<OptimizationItemInput> expanded,
        List<Individual> population,
        List<double[]> personalBest,
        double[][] velocities,
        int iteration,
        CancellationToken cancellationToken,
        ref int evaluations)
    {
        var count = (int)(population.Count * EliminationRate);
        if (count <= 0) return;

        population.Sort((a, b) => a.Fitness.CompareTo(b.Fitness));

        for (var i = 0; i < count; i++)
        {
            var index = population.Count - 1 - i;
            var local = SearchRandom.Derive(input.Seed, iteration + 10_000, index);

            var keys = new double[RandomKeySequence.KeyLength(expanded.Count)];
            for (var k = 0; k < keys.Length; k++) keys[k] = local.Next();

            population[index] = Evaluate(input, expanded, keys, cancellationToken, ref evaluations);
            personalBest[index] = (double[])keys.Clone();
            Array.Clear(velocities[index]);
        }
    }

    // ── Hareket modelleri (Guan vd. 2023, §3) ────────────────────────────────

    /// <summary>Basmuhendis: kuresel kesif. Liderin etrafinda genis adimlar.</summary>
    private static double[] Engineer(Individual current, Individual leader, double[] velocity, SearchRandom rng)
    {
        var keys = new double[current.Keys.Length];
        var sign = rng.Next() < 0.5d ? -1d : 1d;

        for (var i = 0; i < keys.Length; i++)
        {
            var move = sign * (leader.Keys[i] - current.Keys[i]) * rng.Next();
            velocity[i] = (velocity[i] * 0.5d) + move;
            keys[i] = Reflect(leader.Keys[i] + move + (current.Keys[i] * velocity[i]));
        }

        return keys;
    }

    /// <summary>Asker: komsuluk ogrenmesi. Daha iyi bireye dogru, komutanin cekimiyle.</summary>
    private static double[] Soldier(Individual current, Individual peer, Individual commander, double[] velocity, SearchRandom rng)
    {
        var keys = new double[current.Keys.Length];
        var direction = Math.Sign(peer.Fitness - current.Fitness);

        // Esit uygunlukta yon sifira duser ve birey hic hareket etmezdi; esitlik
        // bozucu rastgele bir yon verir (RK-25).
        if (direction == 0) direction = rng.Next() < 0.5d ? -1 : 1;

        for (var i = 0; i < keys.Length; i++)
        {
            velocity[i] = (velocity[i] * 0.5d) + (direction * (peer.Keys[i] - current.Keys[i]));
            keys[i] = Reflect(current.Keys[i] + (velocity[i] * rng.Next()) + ((commander.Keys[i] - current.Keys[i]) * rng.Next()));
        }

        return keys;
    }

    /// <summary>Usta isci: yerel iyilestirme. Adim Gama yogunluguyla iterasyonla daralir.</summary>
    private static double[] Worker(Individual current, Individual master, double[] personalBest, int iteration, SearchRandom rng)
    {
        var keys = new double[current.Keys.Length];
        var step = GammaDensity.Pdf(iteration, GammaShape, GammaScale);

        for (var i = 0; i < keys.Length; i++)
        {
            var pull = 2d * (master.Keys[i] - current.Keys[i]) * rng.Next();
            var memory = (personalBest[i] - current.Keys[i]) * step;
            keys[i] = Reflect(current.Keys[i] + pull + memory);
        }

        return keys;
    }

    /// <summary>
    /// Sinir disi degerler <c>[0,1)</c> araligina KATLANIR, kirpilmaz: kirpma
    /// sinirdaki bireyleri ayni noktaya yigar ve cesitliligi oldururdu (R-C15).
    /// </summary>
    private static double Reflect(double value)
    {
        if (!double.IsFinite(value)) return 0.5d;

        var folded = Math.Abs(value) % 2d;
        if (folded > 1d) folded = 2d - folded;

        return folded >= 1d ? 0.999999d : folded;
    }

    private static Individual Evaluate(
        OptimizationInput input,
        List<OptimizationItemInput> expanded,
        double[] keys,
        CancellationToken cancellationToken,
        ref int evaluations)
    {
        evaluations++;
        var ordered = RandomKeySequence.Decode(expanded, keys, input.ClusterGroups);
        var decoder = RandomKeySequence.Decoder(keys, expanded.Count);
        var result = WallBuilderPlacement.Run(input, ordered, decoder, cancellationToken);

        return new Individual(keys, result, Cost(input, result, expanded.Count));
    }

    /// <summary>
    /// Uygunluk maliyettir, dusuk kazanir; terimler SABIT sirada toplanir
    /// (R-C18). Sert kisit ihlali buraya giremez — Wall-Builder onlari zaten
    /// yerlestirmez, <c>Unplaced</c>'e duserler.
    /// </summary>
    private static double Cost(OptimizationInput input, OptimizationResult result, int totalBoxes)
    {
        var unplaced = result.UnplacedItems.Sum(u => u.Quantity);
        var balance = (double)((result.WeightBalanceOffsetX ?? 0m) + (result.WeightBalanceOffsetZ ?? 0m)) / 100d;
        var balanceWeight = input.Criteria == LoadingPlanOptimizationCriteria.WeightBalance ? 5e4d : 5e2d;

        var cost = ((1d - (double)result.FillRate) * 1e6d)
                   + (totalBoxes > 0 ? (double)unplaced / totalBoxes * 1e5d : 0d)
                   + (balance * balanceWeight);

        return double.IsFinite(cost) ? cost : double.MaxValue;
    }

    private sealed record Individual(double[] Keys, OptimizationResult Result, double Fitness);

    /// <summary>
    /// Sezgisel tohumlar: hacim-azalan, taban-alani-azalan, agirlik-azalan.
    /// Arama bunlarin en iyisinden kotu bir sonuc donduremez (R-C16/R-C21).
    /// </summary>
    private static List<List<OptimizationItemInput>> SeedOrderings(
        List<OptimizationItemInput> expanded,
        LoadingPlanOptimizationCriteria criteria,
        bool clusterGroups)
        =>
        [
            ItemOrdering.SortForGroupPlacement(expanded, criteria, clusterGroups),
            [.. expanded.OrderByDescending(i => i.Width * i.Length).ThenBy(i => i.ItemId)],
            [.. expanded.OrderByDescending(i => i.Weight).ThenBy(i => i.ItemId)],
        ];
}
