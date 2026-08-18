using CargoPilot.Application.Common.Models;
using CargoPilot.Application.Common.Optimization;
using CargoPilot.Domain.Enums;

namespace CargoPilot.Infrastructure.Tests;

/// <summary>
/// PlacementValidator.GetOrientations karakterizasyon testleri.
///
/// Amaç: Faz 1'de altı yüzey modeli gelmeden önce mevcut altı AllowedRotations
/// değerinin ürettiği (w, h, d, rotation) permütasyon kümesini testle sabitlemek.
/// Bu testler davranışı DEĞİŞTİRMEZ; yalnızca mevcut davranışı kayıt altına alır.
/// F2-06'daki eksen rotasyonu değişikliğinin regresyonu bu testlere göre ölçülür.
/// </summary>
public class OptimizationEngineOrientationTests
{
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

    // ── Tam permütasyon kümesi testleri ────────────────────────────────────

    [Fact]
    public void Fixed_ReturnsOnlyNoRotationOrientation()
    {
        var item = CreateItem(100m, 50m, 30m, AllowedRotations.Fixed);

        var orientations = PlacementValidator.GetOrientations(item);

        Assert.Equal(
            [(100m, 50m, 30m, LoadingPlanPlacementRotation.NoRotation)],
            orientations);
    }

    [Fact]
    public void NoVertical_ReturnsNoRotationAndYawOrientations()
    {
        var item = CreateItem(100m, 50m, 30m, AllowedRotations.NoVertical);

        var orientations = PlacementValidator.GetOrientations(item);

        Assert.Equal(
            [
                (100m, 50m, 30m, LoadingPlanPlacementRotation.NoRotation),
                (30m, 50m, 100m, LoadingPlanPlacementRotation.Yaw)
            ],
            orientations);
    }

    [Fact]
    public void NoYaw_ReturnsNoRotationRollAndPitchOrientations()
    {
        var item = CreateItem(100m, 50m, 30m, AllowedRotations.NoYaw);

        var orientations = PlacementValidator.GetOrientations(item);

        Assert.Equal(
            [
                (100m, 50m, 30m, LoadingPlanPlacementRotation.NoRotation),
                (50m, 100m, 30m, LoadingPlanPlacementRotation.Roll),
                (100m, 30m, 50m, LoadingPlanPlacementRotation.Pitch)
            ],
            orientations);
    }

    [Fact]
    public void PitchOnly_ReturnsNoRotationAndPitchOrientations()
    {
        var item = CreateItem(100m, 50m, 30m, AllowedRotations.PitchOnly);

        var orientations = PlacementValidator.GetOrientations(item);

        Assert.Equal(
            [
                (100m, 50m, 30m, LoadingPlanPlacementRotation.NoRotation),
                (100m, 30m, 50m, LoadingPlanPlacementRotation.Pitch)
            ],
            orientations);
    }

    [Fact]
    public void RollOnly_ReturnsNoRotationAndRollOrientations()
    {
        var item = CreateItem(100m, 50m, 30m, AllowedRotations.RollOnly);

        var orientations = PlacementValidator.GetOrientations(item);

        Assert.Equal(
            [
                (100m, 50m, 30m, LoadingPlanPlacementRotation.NoRotation),
                (50m, 100m, 30m, LoadingPlanPlacementRotation.Roll)
            ],
            orientations);
    }

    [Fact]
    public void All_ReturnsAllSixOrientations()
    {
        var item = CreateItem(100m, 50m, 30m, AllowedRotations.All);

        var orientations = PlacementValidator.GetOrientations(item);

        Assert.Equal(
            [
                (100m, 50m, 30m, LoadingPlanPlacementRotation.NoRotation),
                (30m, 50m, 100m, LoadingPlanPlacementRotation.Yaw),
                (50m, 100m, 30m, LoadingPlanPlacementRotation.Roll),
                (100m, 30m, 50m, LoadingPlanPlacementRotation.Pitch),
                (50m, 30m, 100m, LoadingPlanPlacementRotation.YawPitch),
                (30m, 100m, 50m, LoadingPlanPlacementRotation.RollYaw)
            ],
            orientations);
    }

    /// <summary>
    /// `NoVerticalWidth`, Bischoff &amp; Ratcliff'in `011` yönelim bayrağının birebir
    /// karşılığıdır: `W` asla dikey duramaz, `H` ve `L` durabilir ve her dikey
    /// seçim için yatay çift 90 derece dönebilir — dört yönelim (`DR-42`).
    ///
    /// Küme `All`'dan `W`'yi dikeye getiren ikisinin (`Roll`, `RollYaw`)
    /// çıkarılmış hâlidir; bu test iki kümeyi birbirine bağlar.
    /// </summary>
    [Fact]
    public void NoVerticalWidth_ReturnsFourOrientations()
    {
        var item = CreateItem(100m, 50m, 30m, AllowedRotations.NoVerticalWidth);

        var orientations = PlacementValidator.GetOrientations(item);

        Assert.Equal(
            [
                (100m, 50m, 30m, LoadingPlanPlacementRotation.NoRotation),
                (30m, 50m, 100m, LoadingPlanPlacementRotation.Yaw),
                (100m, 30m, 50m, LoadingPlanPlacementRotation.Pitch),
                (50m, 30m, 100m, LoadingPlanPlacementRotation.YawPitch)
            ],
            orientations);
    }

    /// <summary>Yükseklige gelen ölçü asla `W` olamaz; kural bu tek cümledir.</summary>
    [Fact]
    public void NoVerticalWidth_NeverPutsWidthOnVerticalAxis()
    {
        var item = CreateItem(100m, 50m, 30m, AllowedRotations.NoVerticalWidth);

        Assert.All(
            PlacementValidator.GetOrientations(item),
            o => Assert.NotEqual(100m, o.height));
    }

    /// <summary>
    /// `NoVerticalWidth`, `All` kümesinin gerçek bir alt kümesidir. Ayrı bir
    /// permütasyon listesi yazıldığı için ikisi sessizce ayrışabilir.
    /// </summary>
    [Fact]
    public void NoVerticalWidth_AllKumesininAltKumesidir()
    {
        var item = CreateItem(100m, 50m, 30m, AllowedRotations.NoVerticalWidth);
        var all = PlacementValidator.GetOrientations(CreateItem(100m, 50m, 30m, AllowedRotations.All));

        Assert.All(PlacementValidator.GetOrientations(item), o => Assert.Contains(o, all));
    }

    // ── Eksen kilidi değişmezleri ───────────────────────────────────────────

    [Fact]
    public void PitchOnly_KeepsWidthLockedOnXAxis()
    {
        var item = CreateItem(100m, 50m, 30m, AllowedRotations.PitchOnly);

        var orientations = PlacementValidator.GetOrientations(item);

        Assert.All(orientations, o => Assert.Equal(item.Width, o.width));
    }

    [Fact]
    public void RollOnly_KeepsLengthLockedOnZAxis()
    {
        var item = CreateItem(100m, 50m, 30m, AllowedRotations.RollOnly);

        var orientations = PlacementValidator.GetOrientations(item);

        Assert.All(orientations, o => Assert.Equal(item.Length, o.length));
    }

    [Fact]
    public void NoVertical_KeepsHeightLockedOnYAxis()
    {
        var item = CreateItem(100m, 50m, 30m, AllowedRotations.NoVertical);

        var orientations = PlacementValidator.GetOrientations(item);

        Assert.All(orientations, o => Assert.Equal(item.Height, o.height));
    }

    // ── Yasak eksen sızıntısı yok ────────────────────────────────────────────

    [Fact]
    public void NoYaw_DoesNotLeakYawRotations()
    {
        var item = CreateItem(100m, 50m, 30m, AllowedRotations.NoYaw);

        var orientations = PlacementValidator.GetOrientations(item);

        Assert.DoesNotContain(orientations, o =>
            o.rotation is LoadingPlanPlacementRotation.Yaw
                or LoadingPlanPlacementRotation.YawPitch
                or LoadingPlanPlacementRotation.RollYaw);
    }

    // ── Simetrik kutu sınır durumu ───────────────────────────────────────────

    [Fact]
    public void SymmetricBox_AllSixRotationLabelsCollapseToSameDimensions()
    {
        var item = CreateItem(40m, 40m, 40m, AllowedRotations.All);

        var orientations = PlacementValidator.GetOrientations(item);

        Assert.Equal(6, orientations.Length);
        Assert.Equal(6, orientations.Select(o => o.rotation).Distinct().Count());
        Assert.All(orientations, o => Assert.Equal((40m, 40m, 40m), (o.width, o.height, o.length)));
    }
}
