namespace CargoPilot.Domain.Enums;

/// <summary>
/// ERP'deki olcu kolonlarinin birimi. Netsis'te EN/BOY/GENISLIK'in birimini soyleyen
/// bir kolon yoktur; deger kurulum sirasinda musteri tarafindan bildirilir. Varsayilan
/// santimetredir, bugunku davranis budur.
/// </summary>
public enum ErpDimensionUnit
{
    Centimeter = 0,
    Millimeter = 1,
    Meter = 2,
    Inch = 3
}

/// <summary>
/// ERP'deki birim agirlik kolonunun birimi. Varsayilan kilogramdir.
/// </summary>
public enum ErpWeightUnit
{
    Kilogram = 0,
    Gram = 1,
    Pound = 2
}
