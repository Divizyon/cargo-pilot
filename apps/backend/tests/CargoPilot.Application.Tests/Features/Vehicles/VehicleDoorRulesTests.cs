using CargoPilot.Application.Features.Vehicles;
using CargoPilot.Domain.Enums;
using FluentAssertions;

namespace CargoPilot.Application.Tests.Features.Vehicles;

/// <summary>
/// Kapi listesinin gecerlilik kurallari (docs/COORDINATE_STANDARD.md §4, §7).
/// Ayni kurallar veritabaninda CK_VehicleDoors_TipYuzEslesmesi ve
/// IX_VehicleDoors_TekKapiTipi ile de zorlanir.
/// </summary>
public sealed class VehicleDoorRulesTests
{
    private static readonly (DoorType, DoorFace) Rear = (DoorType.Small, DoorFace.LengthZ);
    private static readonly (DoorType, DoorFace) SideLeft = (DoorType.Big, DoorFace.ZeroX);
    private static readonly (DoorType, DoorFace) SideRight = (DoorType.Big, DoorFace.WidthX);
    private static readonly (DoorType, DoorFace) Top = (DoorType.Top, DoorFace.HeightY);

    [Fact]
    public void Kapisiz_arac_reddedilir()
    {
        // Yukun girecegi bir aciklik yoksa arac yuklenemez.
        VehicleDoorRules.Validate([]).Should().Be("Araçta en az bir kapı bulunmalıdır.");
    }

    [Theory]
    [MemberData(nameof(GecerliKombinasyonlar))]
    public void Gecerli_kombinasyonlar_kabul_edilir((DoorType, DoorFace)[] doors)
    {
        VehicleDoorRules.Validate(doors).Should().BeNull();
    }

    public static TheoryData<(DoorType, DoorFace)[]> GecerliKombinasyonlar() => new()
    {
        new[] { Rear },
        new[] { Rear, SideLeft },
        new[] { Rear, SideRight },
        new[] { SideLeft },
        new[] { SideRight },
        new[] { Rear, SideRight, Top },
    };

    /// <remarks>
    /// Iki big door olsaydi x ekseninde, iki small door olsaydi z ekseninde
    /// serbest kose kalmaz ve yuklemenin baslayacagi nokta bulunamazdi (§7).
    /// </remarks>
    [Fact]
    public void Iki_yan_kapi_reddedilir()
    {
        VehicleDoorRules.Validate([SideLeft, SideRight])
            .Should().Be("Aynı tipten birden fazla kapı tanımlanamaz: büyük kapı.");
    }

    [Fact]
    public void Iki_arka_kapi_reddedilir()
    {
        VehicleDoorRules.Validate([Rear, Rear])
            .Should().Be("Aynı tipten birden fazla kapı tanımlanamaz: küçük kapı.");
    }

    [Theory]
    [InlineData(DoorType.Small, DoorFace.WidthX)]
    [InlineData(DoorType.Big, DoorFace.LengthZ)]
    [InlineData(DoorType.Big, DoorFace.HeightY)]
    [InlineData(DoorType.Top, DoorFace.ZeroX)]
    public void Tipe_uymayan_yuz_reddedilir(DoorType type, DoorFace face)
    {
        VehicleDoorRules.Validate([(type, face)]).Should().NotBeNull();
    }

    /// <remarks>
    /// Uzak yuzde (z = 0) kapi olamaz: TIR'da kabin ucudur ve yukleme her zaman
    /// oradan baslar (§7). Bu yuz artik enum'da da yok, o yuzden kural
    /// "tanimli her yuz en az bir tiple eslesir" seklinde dogrulanir: sozlesmede
    /// hicbir tiple eslesmeyen bir yuz kalmamali.
    /// </remarks>
    [Fact]
    public void Sozlesmede_hicbir_tiple_eslesmeyen_yuz_yok()
    {
        var kullanilanYuzler = Enum.GetValues<DoorType>()
            .SelectMany(VehicleDoorRules.AllowedFaces)
            .Distinct();

        kullanilanYuzler.Should().BeEquivalentTo(Enum.GetValues<DoorFace>());
    }

    /// <remarks>
    /// Denetim S-47: "Konteynerde ust yukleme olmaz" kurali yalnizca tekil
    /// LoadingType uzerinden zorlaniyordu; kapi listesiyle gonderildiginde
    /// Container + Top dogrulamadan geciyordu.
    /// </remarks>
    [Fact]
    public void Konteynerde_ust_kapi_reddedilir()
    {
        VehicleDoorRules.Validate([Rear, Top], VehicleType.Container)
            .Should().Be("Konteynerde üst kapı tanımlanamaz.");
    }

    [Fact]
    public void Ust_kapi_diger_arac_tiplerinde_serbest()
    {
        VehicleDoorRules.Validate([Rear, Top], VehicleType.Trailer).Should().BeNull();
        VehicleDoorRules.Validate([Rear, Top], VehicleType.Truck).Should().BeNull();
    }

    [Fact]
    public void Arac_tipi_verilmezse_ust_kapi_kurali_uygulanmaz()
    {
        // Tip bilinmiyorsa kural sessizce uydurulmaz; cagiran taraf gonderir.
        VehicleDoorRules.Validate([Rear, Top]).Should().BeNull();
    }
}
