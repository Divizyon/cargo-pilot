using CargoPilot.Application.Common.Erp;
using CargoPilot.Domain.Enums;
using FluentAssertions;

namespace CargoPilot.Application.Tests.Common.Erp;

/// <summary>
/// ERP olcu kolonlarinin birimi kaynakta yazili degildir; yanlis cevrilen deger
/// olculeri sessizce 10 veya 1000 kat kaydirir.
/// </summary>
public sealed class ErpUnitConverterTests
{
    [Theory]
    [InlineData(ErpDimensionUnit.Centimeter, 40, 40)]
    [InlineData(ErpDimensionUnit.Millimeter, 400, 40)]
    public void ToCentimeters_KaynakBirimineGoreCevirir(ErpDimensionUnit unit, decimal value, decimal expected)
    {
        ErpUnitConverter.ToCentimeters(value, unit).Should().Be(expected);
    }

    /// <remarks>Sifir 'eksik alan' isaretidir; cevrilirse eksiklik rozeti anlamini yitirir.</remarks>
    [Theory]
    [InlineData(0)]
    [InlineData(-5)]
    public void ToCentimeters_SifirVeNegatif_OlduguGibiKalir(decimal value)
    {
        ErpUnitConverter.ToCentimeters(value, ErpDimensionUnit.Millimeter).Should().Be(value);
    }

    [Theory]
    [InlineData(ErpWeightUnit.Kilogram, 8, 8)]
    [InlineData(ErpWeightUnit.Ton, 8, 8000)]
    public void ToKilograms_KaynakBirimineGoreCevirir(ErpWeightUnit unit, decimal value, decimal expected)
    {
        ErpUnitConverter.ToKilograms(value, unit).Should().Be(expected);
    }

    [Fact]
    public void ToKilograms_Sifir_OlduguGibiKalir()
    {
        ErpUnitConverter.ToKilograms(0m, ErpWeightUnit.Ton).Should().Be(0m);
    }

    /// <remarks>
    /// Birim degisince mevcut taslaklar bu oranla yeniden yorumlanir; carpanlar
    /// cevirme ile ayni kaynaktan gelmezse iki yol birbirinden sapardi.
    /// </remarks>
    [Fact]
    public void Carpanlar_CevirmeSonucuylaAyniDegeriVerir()
    {
        ErpUnitConverter.CentimeterFactor(ErpDimensionUnit.Millimeter).Should().Be(0.1m);
        ErpUnitConverter.KilogramFactor(ErpWeightUnit.Ton).Should().Be(1000m);
        (400m * ErpUnitConverter.CentimeterFactor(ErpDimensionUnit.Millimeter))
            .Should().Be(ErpUnitConverter.ToCentimeters(400m, ErpDimensionUnit.Millimeter));
    }
}
