using CargoPilot.Application.Common.Models;
using CargoPilot.Application.Common.Optimization;
using CargoPilot.Domain.Entities;
using CargoPilot.Domain.Enums;
using FluentAssertions;

namespace CargoPilot.Application.Tests.Entities;

/// <summary>
/// Kapi modeli ve yukleme baslangic kosesi (docs/COORDINATE_STANDARD.md §4, §7).
/// Yukleme kapinin bulundugu yuzden baslamaz; baslangic kosesi kapi listesinden
/// turetilir.
/// </summary>
public sealed class VehicleDoorTests
{
    private static readonly Guid VehicleId = Guid.Parse("11111111-1111-4111-8111-111111111111");

    private static VehicleDoor Door(DoorType type, DoorFace face)
        => new(Guid.NewGuid(), VehicleId, type, face);

    /// <remarks>
    /// Tekil enum'un ifade edemedigi durum: bir aracta ayni anda small door ve
    /// big door bulunabilir. Eski modelde SideBoth tek tarafa dusup bilgi
    /// kaybediyordu.
    /// </remarks>
    [Fact]
    public void AracBirdenFazlaKapiTasiyabilir()
    {
        var vehicle = new Vehicle(
            VehicleId, "Test TIR", VehicleType.Trailer, plateNumber: null,
            internalWidth: 245m, internalHeight: 270m, internalLength: 1360m,
            maxWeightCapacity: 24_000m, layerCount: 3,
            loadingType: LoadingType.Rear, companyId: null);

        vehicle.Doors.Add(Door(DoorType.Small, DoorFace.LengthZ));
        vehicle.Doors.Add(Door(DoorType.Big, DoorFace.ZeroX));

        vehicle.Doors.Should().HaveCount(2);
    }

    [Fact]
    public void SolBigDoor_YuklemeKarsiTaraftanBaslar()
    {
        var doors = new List<VehicleDoor>
        {
            Door(DoorType.Small, DoorFace.LengthZ),
            Door(DoorType.Big, DoorFace.ZeroX),
        };

        LoadingCorner.FillFromMaxX(doors).Should().BeTrue();
    }

    [Fact]
    public void SagBigDoor_YuklemeOriginTarafindanBaslar()
    {
        var doors = new List<VehicleDoor>
        {
            Door(DoorType.Small, DoorFace.LengthZ),
            Door(DoorType.Big, DoorFace.WidthX),
        };

        LoadingCorner.FillFromMaxX(doors).Should().BeFalse();
    }

    /// <remarks>
    /// Iki yanda da big door serbest kose birakmazdi; bu kombinasyon artik
    /// veritabani kisitiyla engelleniyor (IX_VehicleDoors_TekBigDoor) ve arac
    /// tanimlanirken secilemiyor. Kural yine de savunmali yazildi: boyle bir
    /// liste gelirse yon degistirmez, yukleme origin kosesinden baslar.
    /// </remarks>
    [Fact]
    public void IkiYandaBigDoor_YonDegistirmez()
    {
        var doors = new List<VehicleDoor>
        {
            Door(DoorType.Big, DoorFace.ZeroX),
            Door(DoorType.Big, DoorFace.WidthX),
        };

        LoadingCorner.FillFromMaxX(doors).Should().BeFalse();
    }

    [Fact]
    public void BigDoorYok_YuklemeOriginTarafindanBaslar()
    {
        var doors = new List<VehicleDoor> { Door(DoorType.Small, DoorFace.LengthZ) };

        LoadingCorner.FillFromMaxX(doors).Should().BeFalse();
    }

    /// <remarks>
    /// LIFO bolge ayrimi artik kapi listesine BAGLI DEGIL: yalnizca buyuk
    /// kapisi olan aracta da bolgeler kurulur (LifoPlacement.ComputeGroupZones).
    /// Bu yuzden LoadingCorner'da referans kapi sorgusu kalmadi; kapi listesinin
    /// motora etkisi tek noktada, yukleme baslangic kosesinde toplandi.
    /// </remarks>
    [Fact]
    public void ReferansKapi_BolgeAyriminin_OnKosulu_Degildir()
    {
        var yalnizcaBuyukKapi = new List<VehicleDoor> { Door(DoorType.Big, DoorFace.ZeroX) };

        // Kapi listesi yalnizca baslangic kosesini belirler.
        LoadingCorner.FillFromMaxX(yalnizcaBuyukKapi).Should().BeTrue();

        // Bolgeler kapiya degil yalnizca LIFO modulune bagli.
        var zones = LifoPlacement.ComputeGroupZones(
            [GrupluUrun(1), GrupluUrun(2)],
            vehicleLength: 300m,
            enabled: true);

        zones.Should().HaveCount(2);
    }

    private static OptimizationItemInput GrupluUrun(int unloadingOrder)
        => new(
            ItemId: Guid.NewGuid(),
            SKU: $"SKU-{unloadingOrder}",
            Name: $"Urun-{unloadingOrder}",
            Width: 100m,
            Height: 100m,
            Length: 40m,
            Weight: 10m,
            IsStackable: true,
            MaxStackCount: 0,
            MaxWeightOnTop: 0m,
            AllowedRotations: AllowedRotations.Fixed,
            Quantity: 1,
            GroupId: Guid.NewGuid(),
            UnloadingOrder: unloadingOrder);
}
