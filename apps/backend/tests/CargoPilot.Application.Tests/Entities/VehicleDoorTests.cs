using CargoPilot.Domain.Entities;
using CargoPilot.Domain.Enums;
using FluentAssertions;

namespace CargoPilot.Application.Tests.Entities;

/// <summary>
/// Kapi modeli kurallari (docs/COORDINATE_STANDARD.md §4, §7). Aciklik payi (x0)
/// yalnizca big door icin anlamlidir; digerlerinde tasinmasi motorun yukleme
/// baslangicini sessizce kaydirmasina yol acardi.
/// </summary>
public sealed class VehicleDoorTests
{
    private static readonly Guid VehicleId = Guid.Parse("11111111-1111-4111-8111-111111111111");

    private static VehicleDoor Create(DoorType type, DoorFace face, decimal clearanceCm = 0m)
        => new(Guid.NewGuid(), VehicleId, type, face, clearanceCm);

    [Fact]
    public void BigDoor_AciklikPayiTasiyabilir()
    {
        var door = Create(DoorType.Big, DoorFace.ZeroX, clearanceCm: 12m);

        door.ClearanceCm.Should().Be(12m);
        door.Face.Should().Be(DoorFace.ZeroX);
    }

    [Theory]
    [InlineData(DoorType.Small, DoorFace.LengthZ)]
    [InlineData(DoorType.Top, DoorFace.HeightY)]
    public void BigDoorDisindakiler_AciklikPayiKabulEtmez(DoorType type, DoorFace face)
    {
        var act = () => Create(type, face, clearanceCm: 12m);

        act.Should().Throw<ArgumentException>();
    }

    [Theory]
    [InlineData(DoorType.Small, DoorFace.LengthZ)]
    [InlineData(DoorType.Big, DoorFace.WidthX)]
    [InlineData(DoorType.Top, DoorFace.HeightY)]
    public void AciklikPayiVerilmezse_SifirBaslar(DoorType type, DoorFace face)
    {
        // Girilmemis pay yukleme sinirini kaydirmaz; kutular duvardan baslar.
        Create(type, face).ClearanceCm.Should().Be(0m);
    }

    [Fact]
    public void NegatifAciklikPayi_Reddedilir()
    {
        var act = () => Create(DoorType.Big, DoorFace.ZeroX, clearanceCm: -1m);

        act.Should().Throw<ArgumentOutOfRangeException>();
    }

    /// <remarks>
    /// Tekil enum'un ifade edemedigi durum: bir aracta ayni anda small door ve iki
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

        vehicle.Doors.Add(Create(DoorType.Small, DoorFace.LengthZ));
        vehicle.Doors.Add(Create(DoorType.Big, DoorFace.ZeroX, 10m));
        vehicle.Doors.Add(Create(DoorType.Big, DoorFace.WidthX, 10m));

        vehicle.Doors.Should().HaveCount(3);
        vehicle.Doors.Count(d => d.Type == DoorType.Big).Should().Be(2);
    }
}
