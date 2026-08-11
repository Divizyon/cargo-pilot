using CargoPilot.Application.Common.Models;
using CargoPilot.Domain.Enums;
using CargoPilot.Engine.Tests.Golden;

namespace CargoPilot.Engine.Tests;

/// <summary>
/// VolumeFirst kriterinin mevcut davranışını kilitler. Testler bir "doğruluk"
/// iddiası değildir; motorun bugünkü çıktısını kayıt altına alır, böylece
/// planlanan yeniden yapılandırma sırasında istemsiz davranış kayması görülür.
/// </summary>
public sealed class VolumeFirstGoldenMasterTests
{
    private const LoadingPlanOptimizationCriteria Criteria = LoadingPlanOptimizationCriteria.VolumeFirst;

    /// <summary>Tek tip kutuların araca sıralı doldurulması: temel greedy davranışı.</summary>
    [Fact]
    public void VolumeFirst_TekTipKutular_SiraliDoldurulur()
    {
        var items = new List<OptimizationItemInput>
        {
            EngineScenario.Item(1, width: 100m, height: 100m, length: 100m, weight: 50m, quantity: 12),
        };

        EngineScenario.Verify(
            nameof(VolumeFirst_TekTipKutular_SiraliDoldurulur),
            EngineScenario.Input(items, Criteria));
    }

    /// <summary>Karışık boyut: hacme göre azalan sıralamanın yerleşime etkisi.</summary>
    [Fact]
    public void VolumeFirst_KarisikBoyutlar_HacimOnceligiyleYerlesir()
    {
        var items = new List<OptimizationItemInput>
        {
            EngineScenario.Item(1, width: 120m, height: 80m, length: 100m, weight: 30m, quantity: 3),
            EngineScenario.Item(2, width: 80m, height: 80m, length: 80m, weight: 15m, quantity: 4),
            EngineScenario.Item(3, width: 60m, height: 60m, length: 60m, weight: 5m, quantity: 5),
        };

        EngineScenario.Verify(
            nameof(VolumeFirst_KarisikBoyutlar_HacimOnceligiyleYerlesir),
            EngineScenario.Input(items, Criteria));
    }

    /// <summary>Araç azami ağırlığı aşıldığında kalan kutular WeightLimitExceeded ile dışarıda kalır.</summary>
    [Fact]
    public void VolumeFirst_AgirlikLimitiAsimi_KalanKutularYerlestirilmez()
    {
        var items = new List<OptimizationItemInput>
        {
            EngineScenario.Item(1, width: 100m, height: 100m, length: 100m, weight: 100m, quantity: 6),
        };

        EngineScenario.Verify(
            nameof(VolumeFirst_AgirlikLimitiAsimi_KalanKutularYerlestirilmez),
            EngineScenario.Input(items, Criteria, vehicleMaxWeight: 300m));
    }

    /// <summary>
    /// İstiflenemez kutu zemini kapladığında üstüne bir şey konamaz; kalan kutular
    /// InsufficientSpace ile dışarıda kalır ve aynı ItemId tek satırda toplanır.
    /// </summary>
    [Fact]
    public void VolumeFirst_IstiflenemezKutu_UstuneYerlestirilemez()
    {
        var items = new List<OptimizationItemInput>
        {
            EngineScenario.Item(
                1,
                width: 100m,
                height: 100m,
                length: 100m,
                weight: 50m,
                isStackable: false,
                allowedRotations: AllowedRotations.Fixed),
            EngineScenario.Item(
                2,
                width: 100m,
                height: 100m,
                length: 100m,
                weight: 50m,
                quantity: 2,
                allowedRotations: AllowedRotations.Fixed),
        };

        EngineScenario.Verify(
            nameof(VolumeFirst_IstiflenemezKutu_UstuneYerlestirilemez),
            EngineScenario.Input(
                items,
                Criteria,
                vehicleWidth: EngineScenario.TallWidth,
                vehicleHeight: EngineScenario.TallHeight,
                vehicleLength: EngineScenario.TallLength));
    }

    /// <summary>
    /// AllowedRotations.Fixed: araç genişliğinden geniş kutu döndürülemediği için
    /// yerleştirilemez, normal kutular etkilenmez.
    /// </summary>
    [Fact]
    public void VolumeFirst_SabitRotasyon_GenisKutuSigmaz()
    {
        EngineScenario.Verify(
            nameof(VolumeFirst_SabitRotasyon_GenisKutuSigmaz),
            EngineScenario.Input(RotationItems(AllowedRotations.Fixed), Criteria));
    }

    /// <summary>
    /// Aynı geometri serbest rotasyonla: geniş kutu Yaw ile döndürülerek yerleşir.
    /// Bir önceki testle çift oluşturur.
    /// </summary>
    [Fact]
    public void VolumeFirst_SerbestRotasyon_GenisKutuDondurulerekYerlesir()
    {
        EngineScenario.Verify(
            nameof(VolumeFirst_SerbestRotasyon_GenisKutuDondurulerekYerlesir),
            EngineScenario.Input(RotationItems(AllowedRotations.All), Criteria));
    }

    private static List<OptimizationItemInput> RotationItems(AllowedRotations allowedRotations)
        => new()
        {
            EngineScenario.Item(
                1,
                width: 300m,
                height: 100m,
                length: 100m,
                weight: 120m,
                quantity: 2,
                allowedRotations: allowedRotations),
            EngineScenario.Item(
                2,
                width: 100m,
                height: 100m,
                length: 100m,
                weight: 40m,
                quantity: 2,
                allowedRotations: allowedRotations),
        };
}
