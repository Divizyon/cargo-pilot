using CargoPilot.Application.Common.Erp;
using CargoPilot.Infrastructure.Services;
using FluentAssertions;
using Microsoft.AspNetCore.DataProtection;

namespace CargoPilot.Application.Tests.Services;

/// <summary>
/// ERP-22: kayitli parola cozulemedigi durumda kullanici anlamsiz bir SqlException degil
/// acik bir yapilandirma hatasi gormeli; hata mesaji sifir bilgi sizdirmamali.
/// </summary>
public sealed class ErpPasswordProtectorTests
{
    private static DataProtectionErpPasswordProtector CreateSut() =>
        new(new EphemeralDataProtectionProvider());

    [Fact]
    public void Unprotect_KendiSifreledigiDegeri_GeriCozer()
    {
        var sut = CreateSut();

        sut.Unprotect(sut.Protect("cok-gizli-parola")).Should().Be("cok-gizli-parola");
    }

    [Theory]
    [InlineData("bozuk-sifreli-metin")]
    [InlineData("")]
    public void Unprotect_CozulemeyenDeger_AciklayiciHataVerir(string cipherText)
    {
        var act = () => CreateSut().Unprotect(cipherText);

        act.Should().Throw<ErpConfigurationException>()
            .WithMessage("*ERP kimlik bilgileri okunamadı*");
    }

    [Fact]
    public void Unprotect_HataMesaji_SifreliDegeriIcermez()
    {
        var act = () => CreateSut().Unprotect("bozuk-sifreli-metin");

        act.Should().Throw<ErpConfigurationException>()
            .Which.Message.Should().NotContain("bozuk-sifreli-metin");
    }
}
