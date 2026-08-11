using CargoPilot.Application.Common.Models;
using CargoPilot.Domain.Enums;

namespace CargoPilot.Application.Common;

/// <summary>
/// Optimizasyon öncesi uyumsuz yük gruplarını (stackGroup / incompatibleGroups) filtreler.
/// En yüksek hacimli grup geçer; çakışan diğer gruplar SegregationOrCompatibility nedeniyle
/// yerleştirilemeyen ürün listesine alınır.
/// </summary>
internal static class ContaminationFilter
{
    internal sealed record Result(
        IReadOnlyList<OptimizationItemInput> Passed,
        IReadOnlyList<UnplacedItemResult> Contaminated);

    /// <summary>
    /// Modül kapalıyken kullanılan sonuç: hiçbir ürün elenmez.
    /// </summary>
    internal static Result Skipped(IReadOnlyList<OptimizationItemInput> items) => new(items, []);

    internal static Result Filter(IReadOnlyList<OptimizationItemInput> items)
    {
        var grouped = items.Where(i => i.StackGroup != null).ToList();
        if (grouped.Count == 0)
            return new Result(items, []);

        // Toplam hacim (cm³) ve item listesi per group.
        var groupVolume = new Dictionary<string, decimal>(StringComparer.OrdinalIgnoreCase);
        var groupItems = new Dictionary<string, List<OptimizationItemInput>>(StringComparer.OrdinalIgnoreCase);

        foreach (var item in grouped)
        {
            var g = item.StackGroup!;
            var vol = item.Width * item.Height * item.Length * item.Quantity;
            groupVolume[g] = groupVolume.GetValueOrDefault(g) + vol;
            if (!groupItems.TryGetValue(g, out var list))
            {
                list = [];
                groupItems[g] = list;
            }
            list.Add(item);
        }

        var presentGroups = groupVolume.Keys.ToList();

        // Undirected conflict graph.
        var conflicts = presentGroups.ToDictionary(
            g => g,
            _ => new HashSet<string>(StringComparer.OrdinalIgnoreCase),
            StringComparer.OrdinalIgnoreCase);

        foreach (var item in grouped)
        {
            var g = item.StackGroup!;
            foreach (var incompatible in (item.IncompatibleGroups ?? []).Where(groupVolume.ContainsKey))
            {
                conflicts[g].Add(incompatible);
                conflicts[incompatible].Add(g);
            }
        }

        // BFS: connected components → her bileşende en büyük hacimli group kazanır.
        var visited = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
        var loserGroups = new HashSet<string>(StringComparer.OrdinalIgnoreCase);

        foreach (var start in presentGroups)
        {
            if (visited.Contains(start)) continue;

            var component = new List<string>();
            var queue = new Queue<string>();
            queue.Enqueue(start);

            while (queue.Count > 0)
            {
                var node = queue.Dequeue();
                if (!visited.Add(node)) continue;
                component.Add(node);
                foreach (var neighbor in conflicts[node].Where(n => !visited.Contains(n)))
                    queue.Enqueue(neighbor);
            }

            if (component.Count <= 1) continue;

            var winner = component.MaxBy(g => groupVolume[g])!;
            foreach (var g in component.Where(g => !string.Equals(g, winner, StringComparison.OrdinalIgnoreCase)))
                loserGroups.Add(g);
        }

        if (loserGroups.Count == 0)
            return new Result(items, []);

        var contaminated = loserGroups
            .SelectMany(g => groupItems[g])
            .Select(i => new UnplacedItemResult(i.ItemId, i.Quantity, UnplacedReason.SegregationOrCompatibility))
            .ToList();

        var loserIds = contaminated.Select(u => u.ItemId).ToHashSet();
        var passed = items.Where(i => !loserIds.Contains(i.ItemId)).ToList();

        return new Result(passed, contaminated);
    }
}
