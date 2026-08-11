using CargoPilot.Application.Common.Models;
using CargoPilot.Domain.Enums;
using CargoPilot.Engine.Tests.Golden;

namespace CargoPilot.Engine.Tests;

/// <summary>
/// Golden-master yaklaşımının ön koşulunu doğrular: motor aynı girdi için aynı
/// çıktıyı üretmeli. Tek istisna PlacementId'dir; motor bunu her çalıştırmada
/// Guid.NewGuid() ile üretir, bu yüzden snapshot'lara dahil edilmez.
/// </summary>
public sealed class DeterminizmTests
{
    /// <summary>Her kriter için aynı girdi üç kez çalıştırılır ve çıktı birebir aynı olmalıdır.</summary>
    [Theory]
    [InlineData(LoadingPlanOptimizationCriteria.VolumeFirst)]
    [InlineData(LoadingPlanOptimizationCriteria.WeightBalance)]
    [InlineData(LoadingPlanOptimizationCriteria.Lifo)]
    public void Motor_AyniGirdiyle_UcKezCalistiginda_AyniCiktiyiUretir(LoadingPlanOptimizationCriteria criteria)
    {
        var input = MixedInput(criteria);
        var scenario = nameof(Motor_AyniGirdiyle_UcKezCalistiginda_AyniCiktiyiUretir);

        var first = GoldenMaster.Serialize(scenario, input, EngineScenario.Run(input));

        for (var attempt = 0; attempt < 2; attempt++)
        {
            var repeated = GoldenMaster.Serialize(scenario, input, EngineScenario.Run(input));
            Assert.Equal(first, repeated);
        }
    }

    /// <summary>
    /// PlacementId'nin neden snapshot dışında bırakıldığını belgeler: motor bu alanı
    /// her çalıştırmada yeniden üretir, dolayısıyla deterministik değildir.
    /// </summary>
    [Fact]
    public void Motor_PlacementId_HerCalistirmada_YenidenUretilir()
    {
        var input = MixedInput(LoadingPlanOptimizationCriteria.VolumeFirst);

        var first = EngineScenario.Run(input).Placements.Select(p => p.PlacementId).ToList();
        var second = EngineScenario.Run(input).Placements.Select(p => p.PlacementId).ToList();

        Assert.NotEmpty(first);
        Assert.Equal(first.Count, second.Count);
        Assert.Empty(first.Intersect(second));
    }

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
