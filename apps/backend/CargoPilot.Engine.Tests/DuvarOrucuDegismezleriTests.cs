using CargoPilot.Application.Common.Models;
using CargoPilot.Domain.Enums;
using CargoPilot.Engine.Tests.Golden;

namespace CargoPilot.Engine.Tests;

/// <summary>
/// Duvar örücü yerleştiricinin fiziksel geçerliliği.
///
/// Neden ayrı bir paket: <see cref="InvariantTests"/> yalnızca greedy yolu
/// kapsıyor. Duvar örücü ise kutuları iki ayrı yerden yerleştiriyor — ana aday
/// döngüsünden ve <c>RaiseBlock</c> blok inşasından. Blok, ana döngünün aday
/// taramasını atlar ve yedi kapıyı doğrudan çağırır; bir eksik çağrı orada
/// fiziksel olarak imkânsız bir plan üretir ve golden snapshot'lar bunu
/// yakalamaz, çünkü snapshot'lar greedy çıktısını kilitliyor.
///
/// Değişmez hesapları <see cref="PhysicalInvariants"/> üzerinden gelir ve
/// üretim kodundan bağımsız yazılmıştır; doğrulanacak kuralı doğrulanan koddan
/// okumak, kural bozulduğunda testi de birlikte bozardı.
/// </summary>
public sealed class DuvarOrucuDegismezleriTests
{
    /// <summary>
    /// Arama testlerinin bütçesi. Üretim varsayılanı değil bilinçli olarak
    /// küçüktür: burada ölçülen şey doluluk değil, aramanın ürettiği HER planın
    /// fiziksel geçerliliği.
    /// </summary>
    private static readonly SearchBudget TestBudget = new(
        MaxIterations: 3, PopulationSize: 4, MaxDurationMs: 500, StallIterations: 2);

    public static TheoryData<string> Senaryolar { get; } = BuildSenaryolar();

    /// <summary>Duvar örücünün statik yolu da greedy ile aynı fizik kurallarına uyar.</summary>
    [Theory]
    [MemberData(nameof(Senaryolar))]
    public void DuvarOrucu_UretilenPlan_FizikselDegismezleriKorur(string senaryo)
    {
        var input = InvariantScenarioSource.Load(senaryo) with
        {
            Strategy = PlacementStrategy.WallBuilder,
        };

        PhysicalInvariants.AssertAll(senaryo, input, EngineScenario.Run(input));
    }

    /// <summary>
    /// Arama katmanı da aynı kurallara uyar. Arama yerleştiriciyi defalarca
    /// çağırır ve EN IYI bireyi döndürür; kural ihlali tek bir bireyde bile
    /// kalsa o birey kazanabilir.
    /// </summary>
    [Theory]
    [MemberData(nameof(Senaryolar))]
    public void DuvarOrucu_AramaKatmaniyla_FizikselDegismezleriKorur(string senaryo)
    {
        var input = InvariantScenarioSource.Load(senaryo) with
        {
            Strategy = PlacementStrategy.WallBuilder,
            Sequencer = SequencerKind.Grasp,
            SearchBudget = TestBudget,
        };

        PhysicalInvariants.AssertAll(senaryo, input, EngineScenario.Run(input));
    }

    /// <summary>
    /// Blok inşasının asıl sınavı: aynı üründen çok sayıda birim. Bu senaryoda
    /// kutular ana döngüden değil neredeyse tamamen bloktan yerleşir, yani
    /// blokun kapı çağrıları burada görünür.
    /// </summary>
    [Fact]
    public void BlokInsasi_AyniUrundenCokBirim_DegismezleriKorur()
    {
        const string senaryo = nameof(BlokInsasi_AyniUrundenCokBirim_DegismezleriKorur);

        var input = EngineScenario.Input(
            [EngineScenario.Item(0, width: 50m, height: 40m, length: 50m, weight: 1m, quantity: 120)],
            LoadingPlanOptimizationCriteria.VolumeFirst,
            strategy: PlacementStrategy.WallBuilder);

        var result = EngineScenario.Run(input);

        PhysicalInvariants.AssertAll(senaryo, input, result);

        // 200x200x400 araca 50x40x50 kutudan 120 adet tam olarak sigar; blok
        // insasi calisiyorsa hepsi yerlesir. Sayi dusuk cikarsa blok, ana
        // dongunun zaten yaptigindan daha azini yapiyor demektir.
        Assert.Equal(120, result.Placements.Count);
        Assert.Empty(result.UnplacedItems);
    }

    /// <summary>
    /// Determinizm sözleşmesi arama katmanında da geçerlidir (`R-C02`/`DR-06`):
    /// aynı tohum + aynı girdi bit birebir aynı planı üretir. Decoder geni
    /// (`R-C15a`) vektöre eklendikten sonra bu ayrıca doğrulanmalıdır —
    /// gen okunurken kayan bir uzunluk sınaması aynı vektörü iki kez farklı
    /// çözebilirdi.
    /// </summary>
    [Theory]
    [InlineData(SequencerKind.Static)]
    [InlineData(SequencerKind.Grasp)]
    public void DuvarOrucu_AyniTohumla_AyniPlaniUretir(SequencerKind sequencer)
    {
        const string senaryo = nameof(DuvarOrucu_AyniTohumla_AyniPlaniUretir);

        var input = EngineScenario.Input(
            [
                EngineScenario.Item(0, 60m, 50m, 70m, weight: 3m, quantity: 14),
                EngineScenario.Item(1, 40m, 90m, 40m, weight: 2m, quantity: 9),
                EngineScenario.Item(2, 80m, 30m, 55m, weight: 4m, quantity: 11),
            ],
            LoadingPlanOptimizationCriteria.VolumeFirst,
            strategy: PlacementStrategy.WallBuilder,
            sequencer: sequencer,
            seed: 7) with
        {
            SearchBudget = TestBudget,
        };

        var first = GoldenMaster.Serialize(senaryo, input, EngineScenario.Run(input));

        for (var attempt = 0; attempt < 2; attempt++)
        {
            Assert.Equal(first, GoldenMaster.Serialize(senaryo, input, EngineScenario.Run(input)));
        }
    }

    /// <summary>
    /// Greedy yolu duvar örücüden etkilenmez. Dallanma tek noktada duruyor
    /// (`R-C07`/`DR-01`) ama blok inşası ana döngüyü değiştirdiği için bu
    /// ayrıca kilitlenir: aynı girdi, iki strateji, greedy çıktısı sabit kalır.
    /// </summary>
    [Fact]
    public void Greedy_DuvarOrucuDegisikliklerinden_Etkilenmez()
    {
        const string senaryo = nameof(Greedy_DuvarOrucuDegisikliklerinden_Etkilenmez);

        var items = new[]
        {
            EngineScenario.Item(0, 60m, 50m, 70m, weight: 3m, quantity: 6),
            EngineScenario.Item(1, 40m, 90m, 40m, weight: 2m, quantity: 4),
        };

        var greedy = EngineScenario.Input(items, LoadingPlanOptimizationCriteria.VolumeFirst);
        var expected = GoldenMaster.Serialize(senaryo, greedy, EngineScenario.Run(greedy));

        _ = EngineScenario.Run(greedy with { Strategy = PlacementStrategy.WallBuilder });

        Assert.Equal(expected, GoldenMaster.Serialize(senaryo, greedy, EngineScenario.Run(greedy)));
    }

    private static TheoryData<string> BuildSenaryolar()
    {
        var data = new TheoryData<string>();

        foreach (var name in InvariantScenarioSource.Names())
        {
            data.Add(name);
        }

        return data;
    }
}
