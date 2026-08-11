namespace CargoPilot.Application.Common.Erp;

/// <summary>
/// Bir ERP cekiminin sonucu ve satir muhasebesi baz cizgisi.
/// <c>SourceTotalCount</c> hicbir eleme uygulanmadan kaynakta bulunan satir sayisidir;
/// <c>DroppedAtSource</c> kaynakta elenen satirlarin neden bazli kirilimidir.
/// Boylece "kayip = SourceTotal - (yazilan + atlanan + elenen)" denklemi kurulabilir.
/// </summary>
public sealed record ErpFetchResult(
    IReadOnlyList<ErpProductDto> Products,
    int SourceTotalCount,
    IReadOnlyDictionary<ErpDropReason, int> DroppedAtSource)
{
    /// <summary>Elemesiz cekim sonucu; kaynak toplami cekilen satir sayisina esittir.</summary>
    public static ErpFetchResult WithoutScreening(IReadOnlyList<ErpProductDto> products) =>
        new(products, products.Count, new Dictionary<ErpDropReason, int>());
}
