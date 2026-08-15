namespace CargoPilot.Application.Common.Erp;

/// <summary>
/// Cekilen satirlarin hangi nedenle elendigini tek yerde tutar. Kaynak tarafindaki (SQL)
/// elemeler fetcher'dan hazir gelir, parti icindeki elemeler burada eklenir; boylece yeni
/// bir eleme nedeni geldiginde muhasebe tek dosyada guncellenir ve mutabakat invariantı
/// sessizce bozulmaz.
/// </summary>
public sealed class RowScreeningPolicy
{
    private readonly Dictionary<ErpDropReason, int> _dropped;
    private readonly HashSet<string> _seenErpIds = new(StringComparer.OrdinalIgnoreCase);

    public RowScreeningPolicy(IReadOnlyDictionary<ErpDropReason, int> droppedAtSource)
    {
        _dropped = new Dictionary<ErpDropReason, int>(droppedAtSource);
    }

    /// <summary>
    /// Satir bu partide daha once gorulduyse elenir. (IntegrationId, ErpId) veritabaninda
    /// unique oldugu icin ayni partideki tekrar hata degil elemedir.
    /// </summary>
    public bool ShouldSkip(string erpId)
    {
        if (_seenErpIds.Add(erpId))
            return false;

        Drop(ErpDropReason.DuplicateErpId);
        return true;
    }

    public void Drop(ErpDropReason reason) =>
        _dropped[reason] = _dropped.GetValueOrDefault(reason) + 1;

    public int TotalDropped => _dropped.Values.Sum();

    /// <summary>Arayuze ve SyncLog'a giden, neden adiyla anahtarlanmis kirilim.</summary>
    public Dictionary<string, int> ToReasonBreakdown() =>
        _dropped.ToDictionary(entry => entry.Key.ToString(), entry => entry.Value);
}
