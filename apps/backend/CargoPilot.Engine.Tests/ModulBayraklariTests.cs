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
    [InlineData(LoadingPlanOptimizationCriteria.VolumeFirst, true, true, false, true)]
    [InlineData(LoadingPlanOptimizationCriteria.WeightBalance, false, true, false, true)]
    [InlineData(LoadingPlanOptimizationCriteria.Lifo, true, false, true, true)]
    public void AcikBayraklar_VarsayilanTuretmeyle_AyniPlaniUretir(
        LoadingPlanOptimizationCriteria criteria,
        bool useVolume,
        bool useWeightBalance,
        bool useLifo,
        bool useContamination)
    {
        var expectedModules = new OptimizationModules(useVolume, useWeightBalance, useLifo, useContamination);
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
    /// LIFO modülü kapatıldığında bölge sözlüğü boş kalır: bölge tohumu da bölge
    /// cezası da oluşmaz, gruplar kapıdan itibaren sıkıştırılır. Bu yüzden en
    /// uzaktaki kutu açık hâldekine göre kapıya daha yakın durur.
    /// </summary>
    [Fact]
    public void LifoKapali_GrupluSenaryoda_BolgeAyrimiUygulanmaz()
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

        var scenario = nameof(LifoKapali_GrupluSenaryoda_BolgeAyrimiUygulanmaz);

        var lifoOff = input with
        {
            Modules = new OptimizationModules(
                UseVolume: true,
                UseWeightBalance: false,
                UseLifo: false,
                UseContamination: true),
        };

        var enabled = EngineScenario.Run(input);
        var disabled = EngineScenario.Run(lifoOff);

        Assert.NotEqual(
            GoldenMaster.Serialize(scenario, input, enabled),
            GoldenMaster.Serialize(scenario, lifoOff, disabled));

        Assert.Equal(enabled.Placements.Count, disabled.Placements.Count);
        // Bölge ayrımı açıkken gruplar araç boyunca dağılır ve yükün bir ucu kapıya
        // (z = length) kadar uzanır. Ceza kalkınca kutular uzak yüzde (z = 0)
        // sıkışır, dolayısıyla en büyük Z küçülür.
        Assert.True(
            disabled.Placements.Max(p => p.Z) < enabled.Placements.Max(p => p.Z),
            $"Bölge cezası kalkınca yük uzak yüzde toplanmalıydı: açık={enabled.Placements.Max(p => p.Z)}, kapalı={disabled.Placements.Max(p => p.Z)}");
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
