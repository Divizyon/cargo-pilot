namespace CargoPilot.Application.Common.Items;

/// <summary>Istif alanlarinin tutarli hale getirilmesi. ERP sync varsayilanlari da bu merkezden gecer.</summary>
public static class ItemStacking
{
    /// <summary>
    /// Istiflenemez urunde adet ve ust agirlik limitini sifirlar; istiflenebilir urunde
    /// eksik/celiskili limitleri urun agirligindan turetir (istiflenebilir + limit 0 celiskisi).
    /// </summary>
    public static (bool IsStackable, int MaxStackCount, decimal MaxWeightOnTop) Normalize(
        bool isStackable,
        int maxStackCount,
        decimal maxWeightOnTop,
        decimal weight)
    {
        if (!isStackable)
            return (false, 0, 0m);

        var count = maxStackCount < 1 ? 1 : maxStackCount;
        var onTop = maxWeightOnTop > 0 ? maxWeightOnTop : Math.Max(weight * count, 1m);
        return (true, count, onTop);
    }
}
