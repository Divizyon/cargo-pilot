namespace CargoPilot.Application.Common.Erp;

/// <summary>
/// Bir plandan ERP'ye aktarilacak satirin kaynak verisi: arac uzerine yerlesen
/// (yani gercekten sevk edilen) urun ve adedi. <c>ErpId</c> null ise urun ERP'den
/// gelmemistir ve stok kodu olarak SKU kullanilir.
/// </summary>
public sealed record PlanErpExportLine(string? ErpId, string Sku, string Name, int Quantity);
