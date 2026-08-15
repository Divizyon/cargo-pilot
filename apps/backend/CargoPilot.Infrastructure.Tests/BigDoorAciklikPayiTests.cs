using CargoPilot.Application.Common.Models;
using CargoPilot.Application.Common.Optimization;
using CargoPilot.Domain.Enums;

namespace CargoPilot.Infrastructure.Tests;

/// <summary>
/// Big door açıklık payı (x₀) yükleme sınırlarını daraltır
/// (docs/COORDINATE_STANDARD.md §7). Kapı <c>x = 0</c> yüzündeyse yükleme
/// origin'den değil <c>(x₀, 0, 0)</c>'dan başlar; <c>x = width</c> yüzündeyse
/// kullanılabilir üst sınır <c>width − x₀</c>'a iner.
///
/// Pay girilmemişse aralık <c>0 → width</c> olarak kalır — motorun bugünkü
/// davranışı — ve golden master senaryoları bunu ayrıca sabitler.
/// </summary>
public sealed class BigDoorAciklikPayiTests
{
    private const decimal VehicleWidth = 300m;
    private const decimal VehicleHeight = 100m;
    private const decimal VehicleLength = 100m;
    private const decimal BoxWidth = 50m;
    private const decimal Clearance = 60m;

    [Fact]
    public void PayYok_YuklemeDuvardanBaslar()
    {
        var result = Run(clearanceAtZeroX: 0m, clearanceAtWidthX: 0m);

        Assert.Contains(result.Placements, p => p.X == 0m);
    }

    [Fact]
    public void PayZeroXYuzunde_HicbirKutuPayinIcineGirmez()
    {
        var result = Run(clearanceAtZeroX: Clearance, clearanceAtWidthX: 0m);

        Assert.NotEmpty(result.Placements);
        Assert.All(result.Placements, p =>
            Assert.True(p.X >= Clearance, $"Kutu açıklık payının içinde: X={p.X}, x₀={Clearance}"));
    }

    [Fact]
    public void PayWidthXYuzunde_HicbirKutuUstSiniriAsmaz()
    {
        var result = Run(clearanceAtZeroX: 0m, clearanceAtWidthX: Clearance);

        var maxX = VehicleWidth - Clearance;
        Assert.NotEmpty(result.Placements);
        Assert.All(result.Placements, p =>
            Assert.True(p.X + p.Width <= maxX, $"Kutu üst sınırı aştı: X+W={p.X + p.Width}, sınır={maxX}"));
    }

    [Fact]
    public void PayIkiYuzdeDe_KutularAradaKalir()
    {
        var result = Run(clearanceAtZeroX: Clearance, clearanceAtWidthX: Clearance);

        var maxX = VehicleWidth - Clearance;
        Assert.NotEmpty(result.Placements);
        Assert.All(result.Placements, p =>
        {
            Assert.True(p.X >= Clearance, $"Kutu alt payın içinde: X={p.X}");
            Assert.True(p.X + p.Width <= maxX, $"Kutu üst payın içinde: X+W={p.X + p.Width}");
        });
    }

    /// <remarks>
    /// Pay kullanılabilir genişliği daralttığı için aynı sayıda kutu sığmaz.
    /// Daralma yalnızca sınır kontrolünde kalmamalı, sonuca da yansımalı.
    /// </remarks>
    [Fact]
    public void Pay_SigabilenKutuSayisiniAzaltir()
    {
        var without = Run(clearanceAtZeroX: 0m, clearanceAtWidthX: 0m);
        var with = Run(clearanceAtZeroX: Clearance, clearanceAtWidthX: Clearance);

        Assert.True(with.Placements.Count < without.Placements.Count,
            $"Pay varken daha az kutu sığmalıydı: paysız={without.Placements.Count}, paylı={with.Placements.Count}");
    }

    private static OptimizationResult Run(decimal clearanceAtZeroX, decimal clearanceAtWidthX)
    {
        var items = Enumerable.Range(0, 6).Select(CreateItem).ToList();

        var input = new OptimizationInput(
            VehicleWidth,
            VehicleHeight,
            VehicleLength,
            VehicleMaxWeight: 10_000m,
            items,
            LoadingPlanOptimizationCriteria.VolumeFirst,
            LoadingType.Rear,
            ClusterGroups: false,
            Modules: null,
            ClearanceAtZeroX: clearanceAtZeroX,
            ClearanceAtWidthX: clearanceAtWidthX);

        return new OptimizationEngine().Run(input);
    }

    private static OptimizationItemInput CreateItem(int index)
        => new(
            ItemId: Guid.NewGuid(),
            SKU: $"SKU-{index}",
            Name: $"Kutu {index}",
            Width: BoxWidth,
            Height: VehicleHeight,
            Length: VehicleLength,
            Weight: 10m,
            IsStackable: false,
            MaxStackCount: 1,
            MaxWeightOnTop: 0m,
            AllowedRotations: AllowedRotations.Fixed,
            Quantity: 1,
            GroupId: null,
            UnloadingOrder: null);
}
