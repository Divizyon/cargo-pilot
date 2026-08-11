using CargoPilot.Application.Common.Models;
using CargoPilot.Domain.Enums;
using CargoPilot.Engine.Tests.Golden;

namespace CargoPilot.Engine.Tests;

/// <summary>
/// Kırılganlık sert kısıtının davranışını doğrular: kırılgan bir ürünün üstüne
/// yük konamaz, kırılgan olmayan aynı senaryo eskisi gibi çalışır ve ret sebebi
/// <see cref="UnplacedReason.FragilityOrHandlingConstraint"/> olarak raporlanır.
///
/// Snapshot karşılaştırması değil, davranışsal testlerdir: mevcut golden-master
/// senaryolarında kırılganlık alanı verilmediği için hiçbiri kaymaz.
/// </summary>
public sealed class KirilganlikTests
{
    /// <summary>Tek kutu eninde ve iki kat yüksekliğinde araç; istif dışında yer bırakmaz.</summary>
    private const decimal ColumnSide = 100m;
    private const decimal TwoLayerHeight = 200m;

    private const decimal BoxWeight = 10m;

    /// <summary>
    /// Kırılgan kutu zeminde, üstünde tek katlık boşluk var. İkinci kutunun
    /// yerleşebileceği başka nokta olmadığı için dışarıda kalır.
    /// </summary>
    [Fact]
    public void KirilganUrununUstune_YukKonamaz()
    {
        var result = EngineScenario.Run(ColumnInput(bottomFragility: FragilityType.Fragile));

        Assert.Single(result.Placements);
        Assert.Equal(EngineScenario.ItemId(1), result.Placements[0].ItemId);

        var unplaced = Assert.Single(result.UnplacedItems);
        Assert.Equal(EngineScenario.ItemId(2), unplaced.ItemId);
        Assert.Equal(1, unplaced.Quantity);
    }

    /// <summary>
    /// Aynı senaryoda alttaki kutu kırılgan değilse istif kurulur: kural
    /// yalnızca kırılganlık alanı verildiğinde devreye girer.
    /// </summary>
    [Fact]
    public void KirilganDegilse_AyniSenaryodaIstifKurulur()
    {
        var result = EngineScenario.Run(ColumnInput(bottomFragility: FragilityType.NonFragile));

        Assert.Equal(2, result.Placements.Count);
        Assert.Empty(result.UnplacedItems);

        var upper = result.Placements.Single(p => p.ItemId == EngineScenario.ItemId(2));
        Assert.Equal(ColumnSide, upper.Y);
    }

    /// <summary>
    /// Ret sebebi artık genel "yer yok" değil, kırılganlık kısıtıdır. Bu sebep
    /// bugüne dek motor tarafından hiç üretilmiyordu.
    /// </summary>
    [Fact]
    public void KirilganlikNedeniyleYerlesemeyenUrun_KirilganlikSebebiyleRaporlanir()
    {
        var result = EngineScenario.Run(ColumnInput(bottomFragility: FragilityType.Fragile));

        var unplaced = Assert.Single(result.UnplacedItems);
        Assert.Equal(UnplacedReason.FragilityOrHandlingConstraint, unplaced.Reason);
    }

    /// <summary>
    /// Kural tek yönlüdür: kırılgan ürünün üstü kapalıdır ama kendisi başka bir
    /// ürünün üstüne yerleştirilebilir.
    /// </summary>
    [Fact]
    public void KirilganUrun_BaskaUrununUstune_Yerlesebilir()
    {
        var items = new List<OptimizationItemInput>
        {
            ColumnBox(index: 1, fragilityType: FragilityType.NonFragile),
            ColumnBox(index: 2, fragilityType: FragilityType.Fragile),
        };

        var result = EngineScenario.Run(ColumnInput(items));

        Assert.Equal(2, result.Placements.Count);
        Assert.Empty(result.UnplacedItems);

        var fragile = result.Placements.Single(p => p.ItemId == EngineScenario.ItemId(2));
        Assert.Equal(ColumnSide, fragile.Y);
    }

    /// <summary>
    /// Kırılganlık dışı nedenlerle yerleşemeyen ürün eskisi gibi
    /// <see cref="UnplacedReason.InsufficientSpace"/> ile raporlanır.
    /// </summary>
    [Fact]
    public void KirilganUrunYokken_RetSebebi_YerYetersizligiKalir()
    {
        var items = new List<OptimizationItemInput>
        {
            ColumnBox(index: 1, fragilityType: FragilityType.NonFragile, quantity: 2),
        };

        // Tek katlık araç: ikinci kutu için ne yan ne üst boşluk var
        var input = EngineScenario.Input(
            items,
            LoadingPlanOptimizationCriteria.VolumeFirst,
            vehicleWidth: ColumnSide,
            vehicleHeight: ColumnSide,
            vehicleLength: ColumnSide);

        var result = EngineScenario.Run(input);

        Assert.Single(result.Placements);
        var unplaced = Assert.Single(result.UnplacedItems);
        Assert.Equal(UnplacedReason.InsufficientSpace, unplaced.Reason);
    }

    /// <summary>Alttaki kutunun kırılganlığı dışında her şeyi aynı olan iki kutuluk senaryo.</summary>
    private static OptimizationInput ColumnInput(FragilityType bottomFragility)
    {
        var items = new List<OptimizationItemInput>
        {
            ColumnBox(index: 1, fragilityType: bottomFragility),
            ColumnBox(index: 2, fragilityType: FragilityType.NonFragile),
        };

        return ColumnInput(items);
    }

    private static OptimizationInput ColumnInput(IReadOnlyList<OptimizationItemInput> items)
        => EngineScenario.Input(
            items,
            LoadingPlanOptimizationCriteria.VolumeFirst,
            vehicleWidth: ColumnSide,
            vehicleHeight: TwoLayerHeight,
            vehicleLength: ColumnSide);

    /// <summary>
    /// Araç kesitini tam dolduran küp. Rotasyon sabittir ve hacimler eşit
    /// olduğu için yerleştirme sırasını ItemId belirler: 1 alta, 2 üste
    /// </summary>
    private static OptimizationItemInput ColumnBox(int index, FragilityType fragilityType, int quantity = 1)
        => EngineScenario.Item(
            index,
            width: ColumnSide,
            height: ColumnSide,
            length: ColumnSide,
            weight: BoxWeight,
            quantity: quantity,
            allowedRotations: AllowedRotations.Fixed,
            fragilityType: fragilityType);
}
