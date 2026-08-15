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
            .Should().Be("Aynı tipten birden fazla kapı tanımlanamaz: yan kapı.");
    }

    [Fact]
    public void Iki_arka_kapi_reddedilir()
    {
        VehicleDoorRules.Validate([Rear, Rear])
            .Should().Be("Aynı tipten birden fazla kapı tanımlanamaz: arka kapı.");
    }

    [Theory]
    [InlineData(DoorType.Small, DoorFace.ZeroZ)]
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
    /// oradan baslar (§7).
    /// </remarks>
    [Fact]
    public void Uzak_yuzde_kapi_tanimlanamaz()
    {
        VehicleDoorRules.AllowedFaces(DoorType.Small).Should().NotContain(DoorFace.ZeroZ);
        VehicleDoorRules.AllowedFaces(DoorType.Big).Should().NotContain(DoorFace.ZeroZ);
        VehicleDoorRules.AllowedFaces(DoorType.Top).Should().NotContain(DoorFace.ZeroZ);
    }
}
