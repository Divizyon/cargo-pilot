using CargoPilot.Application.Common.Models;
using CargoPilot.Domain.Enums;
using CargoPilot.Engine.Tests.Golden;

namespace CargoPilot.Engine.Tests;

/// <summary>
/// WeightBalance kriterinin mevcut davranışını kilitler. Bu kriter, greedy fazdan
/// sonra ImproveBalance ikinci geçişini çalıştırır; snapshot'lar hem yerleşimi hem
/// de ağırlık merkezi / denge sapması alanlarını kapsar.
/// </summary>
public sealed class WeightBalanceGoldenMasterTests
{
    private const LoadingPlanOptimizationCriteria Criteria = LoadingPlanOptimizationCriteria.WeightBalance;

    /// <summary>
    /// Asimetrik ağırlık dağılımı: iki çok ağır kutu ve altı hafif kutu. Greedy faz
    /// ağırlıkları bir tarafa yığdığı için ImproveBalance takas geçişi devreye girer.
    /// </summary>
    [Fact]
    public void WeightBalance_AsimetrikAgirlik_DengeIyilestirmesiCalisir()
    {
        var items = new List<OptimizationItemInput>
        {
            EngineScenario.Item(1, width: 100m, height: 100m, length: 100m, weight: 400m, quantity: 2),
            EngineScenario.Item(2, width: 100m, height: 100m, length: 100m, weight: 20m, quantity: 6),
        };

        EngineScenario.Verify(
            nameof(WeightBalance_AsimetrikAgirlik_DengeIyilestirmesiCalisir),
            EngineScenario.Input(items, Criteria, vehicleMaxWeight: 5_000m));
    }

    /// <summary>Eş ağırlıklı tek tip kutular: köşe tohumlamasının simetrik dağılım etkisi.</summary>
    [Fact]
    public void WeightBalance_TekTipKutular_KoseTohumlariylaDagilir()
    {
        var items = new List<OptimizationItemInput>
        {
            EngineScenario.Item(1, width: 100m, height: 100m, length: 100m, weight: 50m, quantity: 12),
        };

        EngineScenario.Verify(
            nameof(WeightBalance_TekTipKutular_KoseTohumlariylaDagilir),
            EngineScenario.Input(items, Criteria));
    }

    /// <summary>MaxStackCount=1: bir kutunun üzerine yalnızca tek kat konabilir.</summary>
    [Fact]
    public void WeightBalance_IstifSayisiLimiti_UcuncuKatEngellenir()
    {
        var items = new List<OptimizationItemInput>
        {
            EngineScenario.Item(
                1,
                width: 100m,
                height: 100m,
                length: 100m,
                weight: 50m,
                quantity: 4,
                maxStackCount: 1,
                allowedRotations: AllowedRotations.Fixed),
        };

        EngineScenario.Verify(
            nameof(WeightBalance_IstifSayisiLimiti_UcuncuKatEngellenir),
            TallVehicle(items));
    }

    /// <summary>MaxWeightOnTop=60: alttaki kutunun taşıyabileceği ağırlık aşıldığında istif durur.</summary>
    [Fact]
    public void WeightBalance_UstAgirlikLimiti_IstifDurur()
    {
        var items = new List<OptimizationItemInput>
        {
            EngineScenario.Item(
                1,
                width: 100m,
                height: 100m,
                length: 100m,
                weight: 50m,
                quantity: 4,
                maxWeightOnTop: 60m,
                allowedRotations: AllowedRotations.Fixed),
        };

        EngineScenario.Verify(
            nameof(WeightBalance_UstAgirlikLimiti_IstifDurur),
            TallVehicle(items));
    }

    /// <summary>Ağırlık limiti aşımı: WeightBalance ağır kutuları önce sıraladığı için erken doyar.</summary>
    [Fact]
    public void WeightBalance_AgirlikLimitiAsimi_KalanKutularYerlestirilmez()
    {
        var items = new List<OptimizationItemInput>
        {
            EngineScenario.Item(1, width: 100m, height: 100m, length: 100m, weight: 100m, quantity: 5),
        };

        EngineScenario.Verify(
            nameof(WeightBalance_AgirlikLimitiAsimi_KalanKutularYerlestirilmez),
            EngineScenario.Input(items, Criteria, vehicleMaxWeight: 250m));
    }

    private static OptimizationInput TallVehicle(IReadOnlyList<OptimizationItemInput> items)
        => EngineScenario.Input(
            items,
            Criteria,
            vehicleWidth: EngineScenario.TallWidth,
            vehicleHeight: EngineScenario.TallHeight,
            vehicleLength: EngineScenario.TallLength);
}
