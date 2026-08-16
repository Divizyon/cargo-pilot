using CargoPilot.Domain.Entities;
using CargoPilot.Domain.Enums;
using FluentAssertions;

namespace CargoPilot.Application.Tests.Entities;

/// <summary>
/// Denetim S-15/S-17: kapi listesi ve tekil <c>LoadingType</c> iki bagimsiz
/// kaynakti ve hicbir katmanda capraz dogrulanmiyordu. Kolon 3/3c'de tamamen
/// kalkana kadar liste asil kaynak, tekil alan ondan turetilir.
/// </summary>
public sealed class VehicleLoadingTypeSyncTests
{
    private static Vehicle Arac(LoadingType baslangic = LoadingType.Rear)
        => new(
            id: Guid.NewGuid(),
            vehicleName: "Dorse",
            vehicleType: VehicleType.Trailer,
            plateNumber: "34ABC123",
            internalWidth: 240m,
            internalHeight: 260m,
            internalLength: 1360m,
            maxWeightCapacity: 26_000m,
            layerCount: 3,
            loadingType: baslangic,
            companyId: Guid.NewGuid());

    [Theory]
    [InlineData(DoorType.Big, DoorFace.ZeroX, LoadingType.SideLeft)]
    [InlineData(DoorType.Big, DoorFace.WidthX, LoadingType.SideRight)]
    [InlineData(DoorType.Small, DoorFace.LengthZ, LoadingType.Rear)]
    [InlineData(DoorType.Top, DoorFace.HeightY, LoadingType.Top)]
    public void Tek_kapi_dogru_degere_indirgenir(DoorType type, DoorFace face, LoadingType beklenen)
    {
        var arac = Arac();
        arac.ReplaceDoors([(type, face)]);

        arac.SyncLoadingTypeFromDoors();

        arac.LoadingType.Should().Be(beklenen);
    }

    /// <remarks>
    /// Yan kapi oncelikli: x eksenindeki baslangic kosesini o cevirir, yani
    /// yuklemeyi fiilen belirleyen kapi odur.
    /// </remarks>
    [Fact]
    public void Yan_kapi_arka_kapidan_onceliklidir()
    {
        var arac = Arac();
        arac.ReplaceDoors([(DoorType.Small, DoorFace.LengthZ), (DoorType.Big, DoorFace.ZeroX)]);

        arac.SyncLoadingTypeFromDoors();

        arac.LoadingType.Should().Be(LoadingType.SideLeft);
    }

    [Fact]
    public void Ust_kapi_en_dusuk_onceliklidir()
    {
        var arac = Arac();
        arac.ReplaceDoors([(DoorType.Small, DoorFace.LengthZ), (DoorType.Top, DoorFace.HeightY)]);

        arac.SyncLoadingTypeFromDoors();

        arac.LoadingType.Should().Be(LoadingType.Rear);
    }

    /// <remarks>
    /// Eski deger uzerine yazilir: senkron "bosken doldur" degil, "listeden
    /// turet" demektir. Aksi halde kapi degistirilen arac eski yonu tasirdi.
    /// </remarks>
    [Fact]
    public void Eski_deger_uzerine_yazilir()
    {
        var arac = Arac(LoadingType.Top);
        arac.ReplaceDoors([(DoorType.Big, DoorFace.ZeroX)]);

        arac.SyncLoadingTypeFromDoors();

        arac.LoadingType.Should().Be(LoadingType.SideLeft);
    }

    /// <remarks>
    /// Kapisiz arac dogrulamadan gecmiyor; yine de tanimsiz deger birakmamak
    /// icin savunmaci varsayilan uygulanir.
    /// </remarks>
    [Fact]
    public void Kapi_yoksa_varsayilan_Rear()
    {
        var arac = Arac(LoadingType.SideRight);
        arac.ReplaceDoors([]);

        arac.SyncLoadingTypeFromDoors();

        arac.LoadingType.Should().Be(LoadingType.Rear);
    }
}
