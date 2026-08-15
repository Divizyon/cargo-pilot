using CargoPilot.Application.Common.Erp;
using CargoPilot.Application.Common.Items;
using FluentAssertions;

namespace CargoPilot.Application.Tests.Common.Erp;

public sealed class ErpLoadGroupResolverTests
{
    [Theory]
    [InlineData("098-GIDA-XXX", LoadGroups.Food)]
    [InlineData("XX_ICECEK_004", LoadGroups.Food)]
    [InlineData("kimya-01", LoadGroups.Chemical)]
    [InlineData("ANA/TEHLİKELİ/12", LoadGroups.Hazardous)]
    [InlineData("BEYAZESYA-TV", LoadGroups.Electronics)]
    [InlineData("KUMAŞ-DENIM", LoadGroups.Textile)]
    public void GrupKodu_AnahtarKelimeyleEslesir(string groupCode, string expected) =>
        ErpLoadGroupResolver.Resolve(groupCode).Should().Be(expected);

    [Theory]
    [InlineData(null)]
    [InlineData("")]
    [InlineData("   ")]
    [InlineData("ZZ-0099")]
    public void EslesmeyenVeyaBosGrupKodu_GenelDoner(string? groupCode)
    {
        ErpLoadGroupResolver.Resolve(groupCode).Should().Be(LoadGroups.General);
        ErpLoadGroupResolver.CarriesGroupInfo(groupCode).Should().BeFalse();
    }

    [Fact]
    public void HerBilinenGrup_BosOlmayanUyumsuzlukListesiDoner()
    {
        string[] groups =
        [
            LoadGroups.Chemical, LoadGroups.Hazardous, LoadGroups.Food,
            LoadGroups.Electronics, LoadGroups.Textile, LoadGroups.General
        ];

        foreach (var group in groups)
            LoadGroups.IncompatibleWith(group).Should().NotBeEmpty();
    }
}
