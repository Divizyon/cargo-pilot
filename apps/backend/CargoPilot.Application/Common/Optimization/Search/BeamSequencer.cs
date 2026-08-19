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
    /// Isin genisligi SABIT DEGIL: arama D=1'den baslar ve her turda ikiye
    /// katlayarak sure bitene kadar yeniden kosar (Libralesso &amp; Fontan
    /// 2020, iterative beam search). En iyi sonuc turlar boyunca saklanir.
    ///
    /// Neden: sabit genislik-8 kolay kumelerde butcenin dortte birini
    /// kullaniyordu (BR1'de 559 ms / 2000 ms). Iteratif genisletme "once hizli
    /// iyi cozum, sonra derinlestir" davranisi verir ve butceyi doldurur;
    /// ayrica dogal olarak ANYTIME'dir — sure dolunca elde her zaman tamamlanmis
    /// bir tur vardir.
    ///
    /// Geometrik buyume, tekrarlanan isin maliyetini son turun ~2 katinda
    /// tutar; dogrusal artis her turu ayni maliyete getirip israf ederdi.
    /// </summary>
    private const int StartWidth = 1;

    /// <summary>Isin genisliginin tur basina carpani.</summary>
    private const int WidthGrowth = 2;

    /// <summary>
    /// Genislik ust siniri. Olculdu (sabit genislikte, 12 ornek): 4 → %89,12 ·
    /// 8 → %89,46 · 12 → %89,29 · 16 → %89,23 — sekizden sonra dusuyor cunku
    /// genis isin her dala daha az sure birakiyor. Iteratif kipte sure kontrolu
    /// zaten kesiyor; sinir yalnizca sonsuz buyumeyi engeller.
    /// </summary>
    private const int MaxWidth = 64;

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

    /// <summary>
    /// Bir parcada kac farkli "siradaki urun" denenir.
    ///
    /// OLCULDU (beam, 56 ornek; tam yuk dolulugu / %25 yuk yayilmasi):
    ///   4  → %91,15 / x1,276      8  → %91,30 / x1,259
    ///   12 → %91,25 / x1,261      16 → %91,31 / x1,259
    ///
    /// Sekizde doyuyor; 12 ve 16 ayni yere geliyor. Kucuk olani secildi cunku
    /// her ek secim dal sayisini buyutur ve iteratif genisletmeye daha az tur
    /// birakir.
    ///
    /// Neden dortten sekize cikildi: G-3 (kesitte olu seritler) puanlama
    /// tarafindan cozulemiyor — L(b) knapsack kaybi uc bicimde de kaybettirdi
    /// (F8-3) ve VCS ustelleri iki rejimde de DUZ cikti (hacim usteli 3→1,
    /// kayip usteli 2→4: %84,47-84,49 arasi). Kaldirac puanlama degil KARAR
    /// UZAYI; bu olcum onu dogruluyor.
    /// </summary>
    private const int ItemChoices = 8;

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

    /// <summary>
    /// Yerlesimin ulastigi en uzak <c>z</c>. Yukun arac uzunlugunun ne kadarini
    /// kapladigini soyler; leksikografik amacin ikinci anahtaridir.
    /// </summary>
    private static decimal Reach(OptimizationResult result)
    {
        var reach = 0m;

        foreach (var box in result.Placements)
        {
            var end = box.Z + box.Length;
            if (end > reach) reach = end;
        }

        return reach;
    }

    /// <summary>
    /// LEKSIKOGRAFIK amac: once yerlesen hacim, esitse KULLANILAN UZUNLUK.
    ///
    /// Neden gerekiyordu: doluluk yalnizca TASAN yukte ayirt edicidir. Yuk araca
    /// sigdiginda butun kutular yerlesir ve doluluk, yerlesimin bicimi ne olursa
    /// olsun ayni cikar — arama bu rejimde tamamen kor kalir ve tabanini aynen
    /// dondurur. Olculdu (F8-0, 700 ornek/oran): %25 yukte yayilma x1,81, yani
    /// yuk gerekenin neredeyse iki kati uzunluga dagiliyor.
    ///
    /// Wascher, Haussner &amp; Schumann (2007) tipolojisinde bu iki ayri problem
    /// sinifidir: tasan yuk tek-sirt-cantasi (SKP), sigan yuk ACIK BOYUT
    /// problemidir (3B serit paketleme) ve orada amac kullanilan uzunlugu en aza
    /// indirmektir. Leksikografik sira iki sinifi tek fonksiyonda birlestirir.
    ///
    /// Tasan yukte davranis DEGISMEZ: orada doluluklar birbirinden farklidir ve
    /// birinci anahtar kararı verir; uzunluk ancak beraberlikte konusur.
    /// </summary>
    private static bool Better(decimal fill, decimal reach, decimal bestFill, decimal bestReach)
        => fill > bestFill || (fill == bestFill && reach < bestReach);

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
        var bestReach = Reach(baseline);

        // Kosu kimligi (DR-26): planin hangi aramadan ciktigi kaydedilir, yoksa
        // determinizm sozlesmesi (R-C02) kullanilamaz.
        var history = new List<double> { (double)baseline.FillRate };
        var evaluations = 1;
        var levels = 0;

        var segment = Math.Max(1, instances.Count / SegmentCount);

        for (var width = StartWidth; width <= MaxWidth; width *= WidthGrowth)
        {
            if (clock.ElapsedMilliseconds >= budget.MaxDurationMs) break;

            Pass(width);
        }

        clock.Stop();

        return best with
        {
            SearchStats = new SearchStats(
                levels, evaluations, history,
                Better(best.FillRate, bestReach, baseline.FillRate, Reach(baseline)),
                clock.ElapsedMilliseconds),
        };

        // Tek bir isin kosusu: bos aractan baslar, plani parca parca kurar.
        // <c>best</c> disaridan yakalanir ve turlar boyunca birikir.
        void Pass(int width)
        {
        var beam = new List<(PlacementState State, List<SequencedItem> Order)>
        {
            (PlacementState.Fresh(input, instances.Count, null), instances),
        };

        for (var placed = 0; placed < instances.Count; placed += segment)
        {
            cancellationToken.ThrowIfCancellationRequested();
            if (clock.ElapsedMilliseconds >= budget.MaxDurationMs) break;

            var target = placed + segment;
            var branches = new List<(PlacementState State, List<SequencedItem> Order, decimal Fill, decimal Reach)>(
                beam.Count * Variants.Length * ItemChoices);

            // Sure kontrolu ISIN DURUMU granulaligindedir. Daha ince yapmak
            // (dal basina) paralel degerlendirmede DETERMINIZMI bozardi: hangi
            // dalin butce dolmadan bittigi is parcacigi zamanlamasina kalirdi.
            // Daha kaba yapmak (yalniz seviye basina) bir seviyeyi tamamen
            // kosturur ve 2 saniyelik butce 4,5 saniyeye tasardi — bir kez
            // yasandi.
            foreach (var (state, order) in beam)
            {
                if (clock.ElapsedMilliseconds >= budget.MaxDurationMs) break;

                var choices = Choices(order, state.Consumed);

                // Bir isin durumunun butun dallari (urun x ayar) BIRBIRINDEN
                // BAGIMSIZDIR: her biri kendi kopyasi uzerinde calisir ve
                // yerlestirme yolunda degisken statik durum yoktur. Sonuclar
                // sabit indeksli bir diziye yazilir, sonra INDEKS SIRASINDA
                // toplanir — yani paralellik degerlendirme sirasini degistirir,
                // sonucu degistirmez (R-C02).
                var slots = new (PlacementState State, List<SequencedItem> Order, decimal Fill,
                    OptimizationResult Completed, decimal Reach)?[choices.Count * Variants.Length];

                Parallel.For(0, slots.Length, new ParallelOptions
                {
                    CancellationToken = cancellationToken,
                    MaxDegreeOfParallelism = Environment.ProcessorCount,
                }, slot =>
                {
                    var variant = Variants[slot % Variants.Length];
                    var choice = choices[slot / Variants.Length];

                    var (preferred, flags) = Prefer(order, state.Consumed, choice);
                    var seed = state.WithConsumed(flags);

                    var advanced = WallBuilderPlacement.Run(
                        input, preferred, variant, seed, cancellationToken, target).State;

                    // Tamamlama YALNIZCA olcumdur: dalin nereye varacagini
                    // gosterir, kendisi saklanmaz. Bu, "ileri bakis"in ta
                    // kendisidir — acgozlu secim burada bir sonuca baglanir.
                    var completed = WallBuilderPlacement.Run(
                        input, preferred, variant, advanced.Clone(), cancellationToken).Result;

                    slots[slot] = (advanced, preferred, completed.FillRate, completed, Reach(completed));
                });

                foreach (var slot in slots)
                {
                    if (slot is not { } result) continue;

                    evaluations++;

                    if (Better(result.Completed.FillRate, result.Reach, best.FillRate, bestReach))
                    {
                        best = result.Completed;
                        bestReach = result.Reach;
                    }

                    branches.Add((result.State, result.Order, result.Fill, result.Reach));
                }
            }

            if (branches.Count == 0) break;

            // Ilerlemeyen dallar isini tuketir: hicbir dal yeni kutu koymadiysa
            // arama bitmistir.
            if (branches.TrueForAll(b => b.State.Placements.Count <= placed)) break;

            levels++;
            history.Add((double)best.FillRate);

            // Isinda tutulacak dallar da ayni leksikografik sirayla secilir:
            // esit dolulukta daha KISA yerlesim ureten dal once gelir.
            branches.Sort(static (a, b) =>
            {
                var byFill = b.Fill.CompareTo(a.Fill);
                return byFill != 0 ? byFill : a.Reach.CompareTo(b.Reach);
            });

            beam.Clear();
            for (var i = 0; i < branches.Count && i < width; i++)
            {
                beam.Add((branches[i].State, branches[i].Order));
            }
        }
        }
    }
}
