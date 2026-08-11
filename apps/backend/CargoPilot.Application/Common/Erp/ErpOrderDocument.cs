namespace CargoPilot.Application.Common.Erp;

/// <summary>
/// ERP'ye yazilacak siparis satiri. <c>ProductCode</c> ERP'deki stok kodudur
/// (Netsis: TBLSIPATRA.STOK_KODU); uygulama tarafindaki <c>Item.ErpId</c> ile eslesir.
/// </summary>
public sealed record ErpOrderLine(string ProductCode, int Quantity, string? Description);

/// <summary>
/// Plan onayinda ERP'ye yazilan siparis belgesi. <c>OrderNumber</c> plandan deterministik
/// uretilir; ayni plan tekrar aktarilirsa ayni numara olusur ve yazici mukerrer kayit
/// yerine 'zaten var' doner.
/// </summary>
public sealed record ErpOrderDocument(
    string OrderNumber,
    string CustomerCode,
    DateTime OrderDate,
    string? Description,
    IReadOnlyList<ErpOrderLine> Lines);

/// <summary>
/// Yazma sonucu. <c>AlreadyExisted</c> true ise ERP'de ayni siparis numarasi bulundugu
/// icin hicbir satir yazilmamistir; bu bir hata degil, idempotent tekrar denemedir.
/// </summary>
public sealed record ErpOrderWriteResult(int WrittenLineCount, bool AlreadyExisted)
{
    public static ErpOrderWriteResult Written(int lineCount) => new(lineCount, AlreadyExisted: false);

    public static ErpOrderWriteResult AlreadyExists() => new(0, AlreadyExisted: true);
}
