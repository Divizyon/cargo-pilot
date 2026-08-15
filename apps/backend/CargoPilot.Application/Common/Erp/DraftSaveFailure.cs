namespace CargoPilot.Application.Common.Erp;

/// <summary>
/// Veritabani reddettigi icin izlemeden cikarilan taslak satiri.
/// <paramref name="WasNew"/> satirin eklenen mi guncellenen mi oldugunu soyler;
/// sync sayaclari buna gore geri alinir.
/// </summary>
public sealed record DraftSaveFailure(string ErpId, string Sku, string Message, bool WasNew);
