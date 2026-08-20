using CargoPilot.Application.Common.Models;
using CargoPilot.Domain.Enums;

namespace CargoPilot.Application.Common.Optimization;

/// <summary>
/// Yerleştirme sırası: greedy motorun kutuları hangi sırayla denediğini belirler.
/// Motordan çıkarılan saf fonksiyonlardır; durum tutmaz.
///
/// Bu modül kapatılamaz — bir sıra her zaman gerekir — ama kriterle
/// parametrelidir: her kriter kendi anahtarına göre sıralar.
///
/// Tasarım kararı: hepsi <c>static</c>. Sanal çağrı (arayüz/delegate/DI)
/// bilinçli olarak kullanılmaz.
/// </summary>
internal static class ItemOrdering
{
    // ── Grup-bilinçli sıralama ────────────────────────────────────────────────
    // GroupId'si olan items yükleme sırasına göre sıralanır:
    // yüksek UnloadingOrder = en son inecek grup = kapıdan en uzak bölge
    // (uzak yüz, z = 0 tarafı) = önce yüklenir (DESC sıra).
    // GroupId'si olmayan items en sona eklenir.
    // Grup yoksa mevcut criteria-based sıralama uygulanır.
    //
    // Aşağıdaki DESC sıra, LifoPlacement.CompareUnloadingOrder'da adlandırılan
    // yön semantiğinin uygulamasıdır; aynı semantik
    // PlacementValidator.ViolatesStackability (dikey istif) ve
    // PlacementValidator.ViolatesUnloadPath (çıkarılabilirlik) içinde de geçerlidir. Karşılaştırma oraya delege edilmez: OrderByDescending
    // ifadesi golden-master davranışını bire bir korumak için olduğu gibi bırakıldı.
    internal static List<OptimizationItemInput> SortForGroupPlacement(
        IEnumerable<OptimizationItemInput> expanded,
        LoadingPlanOptimizationCriteria criteria,
        bool clusterGroups)
    {
        var list = expanded.ToList();

        var hasGroups = list.Any(i => i.GroupId.HasValue);

        // Kümeleme kapalıysa veya grup yoksa: tüm ürünleri criteria-sort ile karıştır
        if (!hasGroups || !clusterGroups)
            return ApplyCriteriaSort(list, criteria).ToList();

        // Kümeleme açık: gruplu ürünler önce (UnloadingOrder DESC), grupsuzlar sonda
        var grouped = list
            .Where(i => i.GroupId.HasValue)
            .GroupBy(i => (i.GroupId!.Value, i.UnloadingOrder ?? 0))
            .OrderByDescending(g => g.Key.Item2);

        var sortedGrouped = grouped.SelectMany(g => ApplyCriteriaSort(g, criteria));
        var ungrouped = ApplyCriteriaSort(list.Where(i => !i.GroupId.HasValue), criteria);

        return sortedGrouped.Concat(ungrouped).ToList();
    }

    /// <summary>
    /// Kriterin sıralama anahtarı: WeightBalance ağırlığa, diğerleri hacme göre
    /// azalan sırada dener. ItemId eşitlik bozucudur ve determinizmi sağlar.
    /// </summary>
    internal static IEnumerable<OptimizationItemInput> ApplyCriteriaSort(
        IEnumerable<OptimizationItemInput> items,
        LoadingPlanOptimizationCriteria criteria)
        => criteria switch
        {
            LoadingPlanOptimizationCriteria.WeightBalance =>
                items.OrderByDescending(i => i.Weight).ThenBy(i => i.ItemId),
            LoadingPlanOptimizationCriteria.Lifo =>
                items.OrderByDescending(i => i.Width * i.Height * i.Length).ThenBy(i => i.ItemId),
            _ =>
                items.OrderByDescending(i => i.Width * i.Height * i.Length).ThenBy(i => i.ItemId),
        };
}
