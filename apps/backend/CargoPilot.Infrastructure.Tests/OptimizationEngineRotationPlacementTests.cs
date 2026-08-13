using CargoPilot.Application.Common.Models;
using CargoPilot.Application.Common.Optimization;
using CargoPilot.Domain.Enums;

namespace CargoPilot.Infrastructure.Tests;

/// <summary>
/// OptimizationEngine.Run() motor seviyesi rotasyon yerleştirme karakterizasyon testleri.
///
/// Amaç: rotasyon kısıtlarının (AllowedRotations) tüm motor akışı içinde (extreme-point
/// yerleştirme, sınır/çakışma/destek kontrolleri) tutarlı çalıştığını, kilitli eksenlerin
/// yerleşen sonuçta sabit kaldığını ve rotasyon yüzünden yerleşemeyen kutuların hangi
/// UnplacedReason ile raporlandığını mevcut davranışa göre sabitlemek.
/// </summary>
public class OptimizationEngineRotationPlacementTests
{
    private static readonly OptimizationEngine Engine = new();

    private static OptimizationItemInput CreateItem(
        decimal width, decimal height, decimal length, AllowedRotations rotations) =>
        new(
            ItemId: Guid.NewGuid(),
            SKU: "SKU-1",
            Name: "Test Item",
            Width: width,
            Height: height,
            Length: length,
            Weight: 10m,
            IsStackable: true,
            MaxStackCount: 0,
            MaxWeightOnTop: 0m,
            AllowedRotations: rotations,
            Quantity: 1);

    private static OptimizationInput CreateInput(
        decimal vehicleWidth, decimal vehicleHeight, decimal vehicleLength, OptimizationItemInput item) =>
        new(
            VehicleWidth: vehicleWidth,
            VehicleHeight: vehicleHeight,
            VehicleLength: vehicleLength,
            VehicleMaxWeight: 1000m,
            Items: [item]);

    [Fact]
    public void Fixed_UnplacesBoxThatOnlyFitsWhenRotated()
    {
        // Kutu: W=60 sadece Yaw ile Z eksenine (uzunluk=80) sığar; X (genişlik=50) ve
        // Y (yükseklik=50) eksenlerine hiçbir yönelimde sığmaz.
        var item = CreateItem(60m, 20m, 20m, AllowedRotations.Fixed);
        var input = CreateInput(vehicleWidth: 50m, vehicleHeight: 50m, vehicleLength: 80m, item);

        var result = Engine.Run(input);

        Assert.Empty(result.Placements);
        var unplaced = Assert.Single(result.UnplacedItems);
        Assert.Equal(UnplacedReason.InsufficientSpace, unplaced.Reason);
    }

    [Fact]
    public void All_PlacesBoxViaYawRotationWhenFixedWouldFail()
    {
        var item = CreateItem(60m, 20m, 20m, AllowedRotations.All);
        var input = CreateInput(vehicleWidth: 50m, vehicleHeight: 50m, vehicleLength: 80m, item);

        var result = Engine.Run(input);

        Assert.Empty(result.UnplacedItems);
        var placed = Assert.Single(result.Placements);
        Assert.Equal(LoadingPlanPlacementRotation.Yaw, placed.Rotation);
        // Yaw: (L, H, W) — item'ın W'si (60) Z eksenine (Depth) taşınır.
        Assert.Equal(20m, placed.Width);
        Assert.Equal(20m, placed.Height);
        Assert.Equal(60m, placed.Depth);
    }

    [Fact]
    public void RollOnly_VsFixed_RollPlacesWithLengthLockedOnZ_FixedFails()
    {
        // Kutu: W=60 sadece Roll ile Y eksenine (yükseklik=80) taşınırsa sığar.
        var rollItem = CreateItem(60m, 20m, 20m, AllowedRotations.RollOnly);
        var input = CreateInput(vehicleWidth: 50m, vehicleHeight: 80m, vehicleLength: 50m, rollItem);

        var rollResult = Engine.Run(input);

        Assert.Empty(rollResult.UnplacedItems);
        var placed = Assert.Single(rollResult.Placements);
        Assert.Equal(LoadingPlanPlacementRotation.Roll, placed.Rotation);
        // RollOnly değişmezi: L her zaman Z eksenindedir (kilitli).
        Assert.Equal(rollItem.Length, placed.Depth);

        var fixedItem = rollItem with { AllowedRotations = AllowedRotations.Fixed };
        var fixedInput = CreateInput(vehicleWidth: 50m, vehicleHeight: 80m, vehicleLength: 50m, fixedItem);

        var fixedResult = Engine.Run(fixedInput);

        Assert.Empty(fixedResult.Placements);
        var unplaced = Assert.Single(fixedResult.UnplacedItems);
        Assert.Equal(UnplacedReason.InsufficientSpace, unplaced.Reason);
    }

    [Fact]
    public void PitchOnly_VsFixed_PitchPlacesWithWidthLockedOnX_FixedFails()
    {
        // Kutu: H=60 sadece Pitch ile Z eksenine (uzunluk=80) taşınırsa sığar.
        var pitchItem = CreateItem(20m, 60m, 20m, AllowedRotations.PitchOnly);
        var input = CreateInput(vehicleWidth: 50m, vehicleHeight: 50m, vehicleLength: 80m, pitchItem);

        var pitchResult = Engine.Run(input);

        Assert.Empty(pitchResult.UnplacedItems);
        var placed = Assert.Single(pitchResult.Placements);
        Assert.Equal(LoadingPlanPlacementRotation.Pitch, placed.Rotation);
        // PitchOnly değişmezi: W her zaman X eksenindedir (kilitli).
        Assert.Equal(pitchItem.Width, placed.Width);

        var fixedItem = pitchItem with { AllowedRotations = AllowedRotations.Fixed };
        var fixedInput = CreateInput(vehicleWidth: 50m, vehicleHeight: 50m, vehicleLength: 80m, fixedItem);

        var fixedResult = Engine.Run(fixedInput);

        Assert.Empty(fixedResult.Placements);
        var unplaced = Assert.Single(fixedResult.UnplacedItems);
        Assert.Equal(UnplacedReason.InsufficientSpace, unplaced.Reason);
    }

    [Fact]
    public void RotationConstrainedUnplacedBox_ReportsGenericInsufficientSpaceReason()
    {
        // Karakterizasyon notu: motor, rotasyon kısıtı yüzünden yerleşemeyen kutuları
        // UnplacedReason.RotationOrGeometryConstraint yerine genel InsufficientSpace ile
        // raporluyor. RotationOrGeometryConstraint şu an motor tarafından hiç atanmıyor.
        // Bu test mevcut davranışı sabitler; Faz 1'de daha spesifik nedenlendirme
        // eklenirse bilinçli olarak güncellenmelidir.
        var item = CreateItem(60m, 20m, 20m, AllowedRotations.Fixed);
        var input = CreateInput(vehicleWidth: 50m, vehicleHeight: 50m, vehicleLength: 80m, item);

        var result = Engine.Run(input);

        var unplaced = Assert.Single(result.UnplacedItems);
        Assert.Equal(UnplacedReason.InsufficientSpace, unplaced.Reason);
        Assert.NotEqual(UnplacedReason.RotationOrGeometryConstraint, unplaced.Reason);
    }
}
