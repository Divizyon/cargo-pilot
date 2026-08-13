using CargoPilot.Application.Common.Erp;
using CargoPilot.Domain.Enums;
using FluentAssertions;

namespace CargoPilot.Application.Tests.Common.Erp;

/// <summary>
/// ERP olcu kolonlarinin birimi kaynakta yazili degildir; yanlis cevrilen deger
/// olculeri sessizce 10 veya 100 kat kaydirir.
/// </summary>
public sealed class ErpUnitConverterTests
{
    [Theory]
    [InlineData(ErpDimensionUnit.Centimeter, 40, 40)]
    [InlineData(ErpDimensionUnit.Millimeter, 400, 40)]
    [InlineData(ErpDimensionUnit.Meter, 0.4, 40)]
    public void ToCentimeters_KaynakBirimineGoreCevirir(ErpDimensionUnit unit, decimal value, decimal expected)
    {
        ErpUnitConverter.ToCentimeters(value, unit).Should().Be(expected);
    }

    [Fact]
    public void ToCentimeters_Inc_IkiBucukKatiniAsanDegereCevirir()
    {
        ErpUnitConverter.ToCentimeters(10m, ErpDimensionUnit.Inch).Should().Be(25.4m);
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
    [InlineData(ErpWeightUnit.Gram, 8000, 8)]
    public void ToKilograms_KaynakBirimineGoreCevirir(ErpWeightUnit unit, decimal value, decimal expected)
    {
        ErpUnitConverter.ToKilograms(value, unit).Should().Be(expected);
    }

    [Fact]
    public void ToKilograms_Sifir_OlduguGibiKalir()
    {
        ErpUnitConverter.ToKilograms(0m, ErpWeightUnit.Gram).Should().Be(0m);
    }
}
