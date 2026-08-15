using CargoPilot.Domain.Enums;

namespace CargoPilot.Application.Common.Erp;

/// <summary>
/// ERP olculerini uygulamanin ic birimlerine (cm / kg) cevirir. ERP tarafinda birimi
/// bildiren bir kolon olmadigi icin kaynak birim baglanti ayarindan gelir; yanlis
/// bildirilen birim olculeri sessizce 10 veya 1000 kat kaydirirdi.
/// </summary>
public static class ErpUnitConverter
{
    private const decimal CentimetersPerMillimeter = 0.1m;
    private const decimal KilogramsPerTon = 1000m;

    /// <summary>Bir birimlik ERP olcusunun santimetre karsiligi.</summary>
    public static decimal CentimeterFactor(ErpDimensionUnit unit) => unit switch
    {
        ErpDimensionUnit.Millimeter => CentimetersPerMillimeter,
        _ => 1m
    };

    /// <summary>Bir birimlik ERP agirliginin kilogram karsiligi.</summary>
    public static decimal KilogramFactor(ErpWeightUnit unit) => unit switch
    {
        ErpWeightUnit.Ton => KilogramsPerTon,
        _ => 1m
    };

    /// <summary>Sifir ve negatif degerler cevrilmez: bunlar 'eksik alan' isaretidir.</summary>
    public static decimal ToCentimeters(decimal value, ErpDimensionUnit unit) =>
        value <= 0 ? value : value * CentimeterFactor(unit);

    public static decimal ToKilograms(decimal value, ErpWeightUnit unit) =>
        value <= 0 ? value : value * KilogramFactor(unit);
}
