using CargoPilot.Application.Common.Models;
using CargoPilot.Application.Common.Optimization;
using CargoPilot.Domain.Enums;

namespace CargoPilot.Infrastructure.Tests;

/// <summary>
/// Yükleme kapının bulunduğu yüzden başlamaz (docs/COORDINATE_STANDARD.md §7).
/// Kutu kapının önüne yığılırsa operatör kendi açtığı kapıdan içeri giremez, bu
/// yüzden başlangıç köşesi kapıya değmeyen köşedir ve doldurma kapıya doğru
/// ilerler.
///
/// Referans kapı her zaman <c>z = length</c>'te olduğu için z yönü sabittir;
/// değişken olan x eksenidir.
/// </summary>
public sealed class YuklemeBaslangicKosesiTests
{
    private const decimal VehicleWidth = 300m;
    private const decimal VehicleHeight = 100m;
    private const decimal VehicleLength = 100m;
    private const decimal BoxWidth = 100m;

    [Fact]
    public void BigDoorYok_YuklemeOriginKosesindenBaslar()
    {
        var result = Run(fillFromMaxX: false);

        Assert.Contains(result.Placements, p => p.X == 0m);
    }

    [Fact]
    public void BigDoorZeroXYuzunde_YuklemeKarsiKosedenBaslar()
    {
        var result = Run(fillFromMaxX: true);

        // Kapı x = 0 yüzünde; ilk kutu karşı duvara, x = width - genişlik konumuna
        // dayanmalı. Origin köşesinden başlasaydı kapının önünü kapatırdı.
        Assert.Contains(result.Placements, p => p.X + p.Width == VehicleWidth);
    }

    [Fact]
    public void BigDoorZeroXYuzunde_HicbirKutuKapiDuvarindanBaslamaz()
    {
        var partial = RunWithBoxCount(2, fillFromMaxX: true);

        // Araç 300 genişlikte, iki kutu 100'er: x = 0 tarafı boş kalmalı.
        Assert.NotEmpty(partial.Placements);
        Assert.DoesNotContain(partial.Placements, p => p.X == 0m);
    }

    /// <remarks>
    /// Yön yalnızca x'te döner; z ekseninde referans kapı sabit olduğu için
    /// yükleme her koşulda uzak yüzden (z = 0) başlar.
    /// </remarks>
    [Fact]
    public void YonDegisseDe_ZEkseniUzakYuzdenBaslar()
    {
        foreach (var fillFromMaxX in new[] { false, true })
        {
            var result = Run(fillFromMaxX);
            Assert.Contains(result.Placements, p => p.Z == 0m);
        }
    }

    private static OptimizationResult Run(bool fillFromMaxX) => RunWithBoxCount(3, fillFromMaxX);

    private static OptimizationResult RunWithBoxCount(int boxCount, bool fillFromMaxX)
    {
        var items = Enumerable.Range(0, boxCount).Select(CreateItem).ToList();

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
            FillFromMaxX: fillFromMaxX);

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
