using CargoPilot.Domain.Packing;

namespace CargoPilot.Infrastructure.Packing;

internal static class ItemSorter
{
    internal static IReadOnlyList<ItemSpec> Sort(IReadOnlyList<ItemSpec> items, bool lifoEnabled)
    {
        if (!lifoEnabled)
            return items.OrderByDescending(i => i.Length * i.Width * i.Height).ToList();

        var withLifo = items
            .Where(i => i.LifoIndex.HasValue)
            .OrderByDescending(i => i.LifoIndex!.Value)
            .ToList();

        var withoutLifo = items
            .Where(i => !i.LifoIndex.HasValue)
            .OrderByDescending(i => i.Length * i.Width * i.Height)
            .ToList();

        return withLifo.Concat(withoutLifo).ToList();
    }
}
