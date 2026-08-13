namespace CargoPilot.Application.Common.Erp;

/// <summary>
/// ERP'den okunan urun satiri. <c>MissingFields</c> kaynakta bos/sifir gelen alan
/// adlarini tasir (bkz. CargoPilot.Domain.Entities.DraftItemField); satir elenmez,
/// eksik alan isaretiyle taslaga yazilir.
/// </summary>
public sealed record ErpProductDto(
    string ErpId,
    string Sku,
    string Name,
    string ProductType,
    decimal Width,
    decimal Height,
    decimal Length,
    decimal Weight,
    // ERP is grubu kodu (Netsis: GRUP_KODU). Yuk grubuna cevrilir, Tip'e degil.
    string? GroupCode,
    string? Warehouse,
    string? Barcode,
    decimal? Diameter,
    IReadOnlyDictionary<string, string?> ErpConstraints,
    string RawDataJson,
    IReadOnlyList<string>? MissingFields = null);
