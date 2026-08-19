using CargoPilot.Application.Common.Models;
using CargoPilot.Domain.Enums;
using CargoPilot.Engine.Tests.Golden;

namespace CargoPilot.Engine.Tests;

/// <summary>
/// Modül bayraklarının (<see cref="OptimizationModules"/>) davranışını doğrular.
/// Snapshot karşılaştırması değil, davranışsal testlerdir: varsayılan türetmenin
/// bugünkü davranışa eşitliği ve kapatılan modülün planı gerçekten değiştirmesi.
/// </summary>
public sealed class ModulBayraklariTests
{
    /// <summary>
    /// Varsayılan türetme tablosunu kilitler ve bayrakları elle vermenin
    /// <c>Modules = null</c> ile birebir aynı planı ürettiğini gösterir.
    /// Beklenen değerler bilinçli olarak elle yazılmıştır, üretim kodundaki
    /// türetmeden okunmaz.
    /// </summary>
    [Theory]
    [InlineData(LoadingPlanOptimizationCriteria.VolumeFirst, false, true)]
    [InlineData(LoadingPlanOptimizationCriteria.WeightBalance, false, true)]
    [InlineData(LoadingPlanOptimizationCriteria.Lifo, true, true)]
    public void AcikBayraklar_VarsayilanTuretmeyle_AyniPlaniUretir(
        LoadingPlanOptimizationCriteria criteria,
        bool useLifo,
        bool useContamination)
    {
        var expectedModules = new OptimizationModules(useLifo, useContamination);
        Assert.Equal(expectedModules, OptimizationModules.FromCriteria(criteria));

        var input = MixedInput(criteria);
        var scenario = nameof(AcikBayraklar_VarsayilanTuretmeyle_AyniPlaniUretir);

        var withDefaults = GoldenMaster.Serialize(scenario, input, EngineScenario.Run(input));

        var explicitInput = input with { Modules = expectedModules };
        var withExplicitFlags = GoldenMaster.Serialize(scenario, explicitInput, EngineScenario.Run(explicitInput));

        Assert.Equal(withDefaults, withExplicitFlags);
    }

    // NOT: `DengeKapali_WeightBalanceKriterinde_DahaDengesizPlanUretir` testi
    // kaldırıldı. Sınadığı mekanizmanın tamamı greedy'ye aitti — köşe
    // tohumlaması, denge terimi ve `ImproveBalance` ikinci geçişi. Duvar örücü
    // `UseWeightBalance` bayrağını hiç okumuyor, dolayısıyla bayrak açık ve
    // kapalı hâlde birebir aynı planı üretiyor ve test "farklı olmalı" diye
    // ısrar ederken aslında var olmayan bir modülü sınıyordu.
    //
    // Kaybın büyüklüğü silinmeden önce ölçüldü ve kayda geçti (`DR-39`):
    // denge sapması greedy'nin ~3 katı. Bu bir kabul, bir unutma değil.

    /// <summary>
    /// LIFO açıkken üretilen plan boşaltma kuralına uyar: her kutu, kendi iniş
    /// sırası geldiğinde hâlâ araçta olan hiçbir kutuyu oynatmadan çıkabilir.
    ///
    /// Bu test eskiden "modülü kapatınca yerleşim DEĞİŞİR" diye iddia ediyordu ve
    /// bant modelinde doğruydu: bant kutuları araç boyunca dağıtıyordu. Kural
    /// bantdan çıkarılabilirliğe geçince iddia düştü — yeni kural bir SÜRÜCÜ
    /// değil MUHAFIZ'dır. Yükleme sırası grupları zaten doğru dizdiği için kolay
    /// senaryolarda hiçbir şeye dokunmaz; yalnızca yanlış bir yerleşimi engeller.
    ///
    /// BORÇ: kuralın gerçekten bağladığı bir birim senaryo yok. Bağlaması için
    /// bir grubun ötekinin üstünden KÖPRÜ kurup arkada cep bırakması gerekiyor
    /// (bkz. <see cref="CepYerlesimiTests"/> geometrisi). Korpus ölçümünde kural
    /// belirgin biçimde bağlıyor: gerçek korpusta beş bin yüz kırk sekiz ihlalden
    /// sıfıra iniyor.
    /// </summary>
    [Fact]
    public void Lifo_GrupluSenaryoda_BosaltmaYoluAcikKalir()
    {
        var items = new List<OptimizationItemInput>
        {
            GroupItem(1, groupIndex: 1, unloadingOrder: 1),
            GroupItem(2, groupIndex: 2, unloadingOrder: 2),
            GroupItem(3, groupIndex: 3, unloadingOrder: 3),
        };

        var input = EngineScenario.Input(
            items,
            LoadingPlanOptimizationCriteria.Lifo,
            vehicleWidth: EngineScenario.CorridorWidth,
            vehicleHeight: EngineScenario.CorridorHeight,
            vehicleLength: EngineScenario.CorridorLength,
            vehicleMaxWeight: 10_000m);

        var scenario = nameof(Lifo_GrupluSenaryoda_BosaltmaYoluAcikKalir);
        var result = EngineScenario.Run(input);

        Assert.Equal(6, result.Placements.Count);
        PhysicalInvariants.AssertAll(scenario, input, result);
    }

    private static OptimizationItemInput GroupItem(int index, int groupIndex, int unloadingOrder)
        => EngineScenario.Item(
            index,
            width: 100m,
            height: 100m,
            length: 40m,
            weight: 100m,
            quantity: 2,
            allowedRotations: AllowedRotations.Fixed,
            groupIndex: groupIndex,
            unloadingOrder: unloadingOrder);

    private static OptimizationInput MixedInput(LoadingPlanOptimizationCriteria criteria)
    {
        var items = new List<OptimizationItemInput>
        {
            EngineScenario.Item(1, width: 120m, height: 80m, length: 100m, weight: 60m, quantity: 3, groupIndex: 1, unloadingOrder: 1),
            EngineScenario.Item(2, width: 80m, height: 80m, length: 80m, weight: 25m, quantity: 4, groupIndex: 2, unloadingOrder: 2),
            EngineScenario.Item(3, width: 60m, height: 60m, length: 60m, weight: 5m, quantity: 4, allowedRotations: AllowedRotations.NoVertical),
        };

        return EngineScenario.Input(items, criteria);
    }
}
