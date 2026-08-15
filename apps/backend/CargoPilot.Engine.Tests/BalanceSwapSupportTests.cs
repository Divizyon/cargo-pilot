using System.Globalization;
using CargoPilot.Application.Common.Models;
using CargoPilot.Domain.Enums;
using CargoPilot.Engine.Tests.Golden;

namespace CargoPilot.Engine.Tests;

/// <summary>
/// OPT-01 regresyon testi: <c>BalanceScoring.SwapIsValid</c> içinde takas sonrası
/// üstteki kutunun destek doğrulaması <c>if (a.H != b.H)</c> bloğuna hapsedilmiştir.
/// Eşit yükseklikte fakat farklı taban alanlı iki kutu takas edildiğinde kontrol
/// hiç çalışmaz ve üstteki kutu havada kalabilir.
///
/// Senaryo (araç 200x200x100):
///   A(0,0,0)  100x50x100  ağırlık 100
///   B(100,0,0) 50x50x100  ağırlık 10
///   C(0,50,0) 100x50x100  ağırlık 10   → A'nın üstünde, %100 destekli
/// A ile B eşit yükseklikte (H=50) ama farklı taban alanlı. Denge iyileştirici
/// A ve B'yi takas ederek CoG sapmasını 0.4375'ten 0.3125'e düşürür; bu takas
/// C'nin destek oranını %100'den %50'ye indirir.
/// </summary>
public sealed class BalanceSwapSupportTests
{
    private const decimal VehicleWidth = 200m;
    private const decimal VehicleHeight = 200m;
    private const decimal VehicleLength = 100m;
    private const decimal VehicleMaxWeight = 10_000m;

    private const decimal LayerHeight = 50m;
    private const decimal FullDepth = 100m;

    /// <summary>Alttaki geniş ve ağır kutu (A) ile üstteki kutunun (C) taban genişliği.</summary>
    private const decimal WideWidth = 100m;

    /// <summary>Alttaki dar ve hafif kutu (B); A ile eşit yükseklikte, farklı taban alanlı.</summary>
    private const decimal NarrowWidth = 50m;

    /// <summary>
    /// Denge takası üstteki kutuyu havada bırakmamalıdır. Düzeltme yapılana
    /// kadar bu test kırmızıdır; hata mesajı C'nin gerçek destek oranını verir.
    /// </summary>
    [Fact]
    public void WeightBalance_EsitYukseklikteFarkliTabanliTakas_UsttekiKutuyuHavadaBirakmaz()
    {
        var result = EngineScenario.Run(SwapInput(LoadingPlanOptimizationCriteria.WeightBalance));

        Assert.Equal(3, result.Placements.Count);

        var ust = result.Placements.Single(p => p.ItemId == EngineScenario.ItemId(3));
        var destekOrani = PhysicalInvariants.SupportRatio(ust, result.Placements);

        Assert.True(
            destekOrani >= PhysicalInvariants.SupportThreshold,
            string.Create(CultureInfo.InvariantCulture,
                $"C kutusunun destek oranı {destekOrani:0.00}, gereken {PhysicalInvariants.SupportThreshold:0.00}. C konumu ({ust.X},{ust.Y},{ust.Z}). ImproveBalance, eşit yükseklikli (H={LayerHeight}) fakat farklı taban alanlı A ve B kutularını takas etti; SwapIsValid'deki üst kutu destek doğrulaması `a.H != b.H` bloğuna hapsedildiği için hiç çalışmadı (OPT-01)."));
    }

    /// <summary>
    /// Senaryonun ön koşulu: denge modülü kapalıyken greedy faz beklenen üç katlı
    /// yerleşimi üretir. Takas geçişi hiç çalışmadığı için C tam desteklidir.
    /// Bu test, yukarıdaki kırmızının takastan kaynaklandığını belgeler.
    /// </summary>
    [Fact]
    public void DengeModuluKapali_GreedyFaz_UcKutuyuTamDesteklePlanlar()
    {
        var input = SwapInput(LoadingPlanOptimizationCriteria.WeightBalance) with
        {
            Modules = new OptimizationModules(
                UseVolume: true,
                UseWeightBalance: false,
                UseLifo: false,
                UseContamination: true),
        };

        var result = EngineScenario.Run(input);

        Assert.Equal(3, result.Placements.Count);

        var alt = result.Placements.Single(p => p.ItemId == EngineScenario.ItemId(1));
        var dar = result.Placements.Single(p => p.ItemId == EngineScenario.ItemId(2));
        var ust = result.Placements.Single(p => p.ItemId == EngineScenario.ItemId(3));

        Assert.Equal((0m, 0m, 0m), (alt.X, alt.Y, alt.Z));
        Assert.Equal((WideWidth, 0m, 0m), (dar.X, dar.Y, dar.Z));
        Assert.Equal((0m, LayerHeight, 0m), (ust.X, ust.Y, ust.Z));

        Assert.Equal(1m, PhysicalInvariants.SupportRatio(ust, result.Placements));
    }

    /// <summary>
    /// Ağırlık sırası yerleşim sırasını belirler: A (100 kg) önce, ardından eşit
    /// ağırlıktaki B ve C ItemId sırasıyla. Rotasyon sabittir ki denetimdeki
    /// geometri birebir kurulsun.
    /// </summary>
    private static OptimizationInput SwapInput(LoadingPlanOptimizationCriteria criteria)
    {
        var items = new List<OptimizationItemInput>
        {
            EngineScenario.Item(1, width: WideWidth, height: LayerHeight, length: FullDepth, weight: 100m, allowedRotations: AllowedRotations.Fixed),
            EngineScenario.Item(2, width: NarrowWidth, height: LayerHeight, length: FullDepth, weight: 10m, allowedRotations: AllowedRotations.Fixed),
            EngineScenario.Item(3, width: WideWidth, height: LayerHeight, length: FullDepth, weight: 10m, allowedRotations: AllowedRotations.Fixed),
        };

        return EngineScenario.Input(
            items,
            criteria,
            vehicleWidth: VehicleWidth,
            vehicleHeight: VehicleHeight,
            vehicleLength: VehicleLength,
            vehicleMaxWeight: VehicleMaxWeight);
    }
}
