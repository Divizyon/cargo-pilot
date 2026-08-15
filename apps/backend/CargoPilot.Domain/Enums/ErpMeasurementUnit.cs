namespace CargoPilot.Domain.Enums;

/// <summary>
/// ERP'deki olcu kolonlarinin birimi. Netsis'te EN/BOY/GENISLIK'in birimini soyleyen
/// bir kolon yoktur; deger kurulum sirasinda musteri tarafindan bildirilir. Secenekler
/// sistem ayarlarindaki olcu birimleriyle ayni tutulur: sahada metre ve inc kullanan
/// bir kurulum yok.
/// </summary>
public enum ErpDimensionUnit
{
    Centimeter = 0,
    Millimeter = 1
}

/// <summary>
/// ERP'deki birim agirlik kolonunun birimi. Secenekler sistem ayarlarindaki agirlik
/// birimleriyle ayni tutulur.
/// </summary>
public enum ErpWeightUnit
{
    Kilogram = 0,
    Ton = 1
}
