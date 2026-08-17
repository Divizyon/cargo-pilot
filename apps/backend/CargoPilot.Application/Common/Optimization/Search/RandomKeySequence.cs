using CargoPilot.Application.Common.Models;
using CargoPilot.Application.Common.Optimization.WallBuilder;

namespace CargoPilot.Application.Common.Optimization.Search;

/// <summary>
/// Random-key kodlamasi: surekli bir vektoru yerlestirme sirasina cevirir.
///
/// GWCA surekli optimizasyon icin tasarlandi; kutu sirasi ise ayrik bir
/// permutasyon. Kopru random-key'dir: her kutuya bir <c>[0,1)</c> anahtari
/// dusar, anahtarlar siralaninca permutasyon cikar. Boylece meta-sezgisel
/// denklemlerini hic degistirmeden ayrik probleme uygulanabilir
/// (ALGORITMA-RULEBOOK.md R-C15).
///
/// Siralama KARARLI olmak zorunda: esit anahtarlarda cozum kutunun kendi
/// sirasina duser, yoksa ayni vektor iki kez farkli permutasyon uretebilirdi.
/// </summary>
internal static class RandomKeySequence
{
    /// <summary>
    /// Anahtarlari siraya cevirir. Birey <c>double[2N]</c>'dir: ilk N eleman sira
    /// anahtari, ikinci N eleman yonelim anahtari (R-C15). Yonelim anahtari
    /// kutuyla birlikte tasinir cunku sira degistiginde hangi anahtarin hangi
    /// kutuya ait oldugu kaybolmamali.
    ///
    /// Gruplu urunlerde gruplar arasi sira bosaltma sirasidir ve arama onu
    /// bozamaz; anahtarlar yalnizca grup ICINDE siralar (R-C19). Aksi halde
    /// meta-sezgisel LIFO vaadini delerdi.
    /// </summary>
    internal static List<SequencedItem> Decode(
        IReadOnlyList<OptimizationItemInput> instances,
        double[] keys,
        bool clusterGroups)
    {
        var indexed = new (OptimizationItemInput Item, double Key, int Index)[instances.Count];
        for (var i = 0; i < instances.Count; i++)
        {
            indexed[i] = (instances[i], keys[i], i);
        }

        var query = clusterGroups && instances.Any(i => i.GroupId.HasValue)
            ? indexed
                .OrderBy(e => e.Item.GroupId.HasValue ? 0 : 1)
                .ThenByDescending(e => e.Item.UnloadingOrder ?? 0)
                .ThenBy(e => e.Key)
                .ThenBy(e => e.Index)
            : indexed
                .OrderBy(e => e.Key)
                .ThenBy(e => e.Index);

        var orientationOffset = instances.Count;

        return
        [
            .. query.Select(e => new SequencedItem(
                e.Item,
                orientationOffset + e.Index < keys.Length ? keys[orientationOffset + e.Index] : SequencedItem.NoPreference)),
        ];
    }

    /// <summary>
    /// Verilen siralamayi ureten anahtar vektoru. Sezgisel tohumlari (hacim-azalan
    /// gibi) aramanin baslangic populasyonuna sokmak icin gerekir: tohum bir sira
    /// olarak biliniyor, arama ise vektorle calisiyor.
    /// </summary>
    internal static double[] Encode(
        IReadOnlyList<OptimizationItemInput> instances,
        IReadOnlyList<OptimizationItemInput> ordered)
    {
        var keys = new double[instances.Count];
        var position = new Dictionary<int, int>(instances.Count);

        // Ayni urunun birden cok kopyasi var; eslesme kimlige gore degil, sirayla
        // tuketilerek yapilir.
        var cursorByItem = new Dictionary<Guid, int>();
        var buckets = new Dictionary<Guid, List<int>>();

        for (var i = 0; i < instances.Count; i++)
        {
            if (!buckets.TryGetValue(instances[i].ItemId, out var bucket))
            {
                bucket = [];
                buckets[instances[i].ItemId] = bucket;
            }

            bucket.Add(i);
        }

        for (var rank = 0; rank < ordered.Count; rank++)
        {
            var id = ordered[rank].ItemId;
            var cursor = cursorByItem.GetValueOrDefault(id);
            cursorByItem[id] = cursor + 1;

            var bucket = buckets[id];
            if (cursor < bucket.Count) position[bucket[cursor]] = rank;
        }

        var step = instances.Count > 0 ? 1d / instances.Count : 1d;
        for (var i = 0; i < instances.Count; i++)
        {
            keys[i] = position.GetValueOrDefault(i, i) * step;
        }

        return keys;
    }
}
