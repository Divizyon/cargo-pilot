using CargoPilot.Domain.Enums;

namespace CargoPilot.Application.Common.Erp;

/// <summary>
/// ERP olculerini uygulamanin ic birimlerine (cm / kg) cevirir. ERP tarafinda birimi
/// bildiren bir kolon olmadigi icin kaynak birim baglanti ayarindan gelir; yanlis
/// bildirilen birim olculeri sessizce 10 veya 100 kat kaydirirdi.
/// </summary>
public static class ErpUnitConverter
{
    private const decimal MillimetersPerCentimeter = 10m;
    private const decimal CentimetersPerMeter = 100m;
    private const decimal CentimetersPerInch = 2.54m;
    private const decimal GramsPerKilogram = 1000m;
    private const decimal KilogramsPerPound = 0.45359237m;

    /// <summary>Sifir ve negatif degerler cevrilmez: bunlar 'eksik alan' isaretidir.</summary>
    public static decimal ToCentimeters(decimal value, ErpDimensionUnit unit)
    {
        if (value <= 0)
            return value;

        return unit switch
        {
            ErpDimensionUnit.Millimeter => value / MillimetersPerCentimeter,
            ErpDimensionUnit.Meter => value * CentimetersPerMeter,
            ErpDimensionUnit.Inch => value * CentimetersPerInch,
            _ => value
        };
    }

    public static decimal ToKilograms(decimal value, ErpWeightUnit unit)
    {
        if (value <= 0)
            return value;

        return unit switch
        {
            ErpWeightUnit.Gram => value / GramsPerKilogram,
            ErpWeightUnit.Pound => value * KilogramsPerPound,
            _ => value
        };
    }
}
