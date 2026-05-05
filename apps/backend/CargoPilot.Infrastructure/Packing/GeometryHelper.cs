using CargoPilot.Domain.Enums;
using CargoPilot.Domain.Packing;

namespace CargoPilot.Infrastructure.Packing;

internal static class GeometryHelper
{
    private const double Epsilon = 1e-6;

    internal static IReadOnlyList<Rotation> GetRotations(ItemSpec item)
    {
        decimal l = item.Length, w = item.Width, h = item.Height;

        return item.AllowedRotations switch
        {
            AllowedRotations.Fixed => new List<Rotation> { new(l, w, h) },
            AllowedRotations.NoVertical => new List<Rotation> { new(l, w, h), new(w, l, h) },
            _ => new List<Rotation>
            {
                new(l, w, h),
                new(l, h, w),
                new(w, l, h),
                new(w, h, l),
                new(h, l, w),
                new(h, w, l)
            }
        };
    }

    internal static bool CheckBoundary(ExtremePoint ep, Rotation rot, ContainerSpec container)
    {
        return ep.X + rot.L <= container.Length + (decimal)Epsilon
            && ep.Y + rot.W <= container.Width + (decimal)Epsilon
            && ep.Z + rot.H <= container.Height + (decimal)Epsilon;
    }

    internal static bool CheckNoOverlap(ExtremePoint ep, Rotation rot, IReadOnlyList<PlacedItem> placed)
    {
        foreach (var p in placed)
        {
            bool separatedX = (double)(ep.X + rot.L) <= (double)p.Position.X + Epsilon
                           || (double)(p.Position.X + p.Rotation.L) <= (double)ep.X + Epsilon;
            bool separatedY = (double)(ep.Y + rot.W) <= (double)p.Position.Y + Epsilon
                           || (double)(p.Position.Y + p.Rotation.W) <= (double)ep.Y + Epsilon;
            bool separatedZ = (double)(ep.Z + rot.H) <= (double)p.Position.Z + Epsilon
                           || (double)(p.Position.Z + p.Rotation.H) <= (double)ep.Z + Epsilon;

            if (!(separatedX || separatedY || separatedZ))
                return false;
        }
        return true;
    }

    // Zemin desteği: alt yüzeyin en az %80'i zemin veya altındaki ürün üst yüzeyi tarafından desteklenmeli.
    internal static bool CheckGroundSupport(
        ExtremePoint ep,
        Rotation rot,
        IReadOnlyList<PlacedItem> placed,
        ContainerSpec container)
    {
        decimal footprintArea = rot.L * rot.W;

        // Zemin üzerinde (z ≈ 0) → tam destek
        if ((double)ep.Z < Epsilon)
            return true;

        decimal supportedArea = 0m;

        foreach (var p in placed)
        {
            // Altındaki ürünün üst yüzeyi bu ürünün alt yüzeyiyle çakışıyor mu?
            if (Math.Abs((double)(p.Position.Z + p.Rotation.H - ep.Z)) > Epsilon)
                continue;

            decimal ix = IntersectLength(ep.X, ep.X + rot.L, p.Position.X, p.Position.X + p.Rotation.L);
            decimal iy = IntersectLength(ep.Y, ep.Y + rot.W, p.Position.Y, p.Position.Y + p.Rotation.W);

            if (ix > 0 && iy > 0)
                supportedArea += ix * iy;
        }

        return supportedArea / footprintArea >= 0.80m;
    }

    // İstif kontrolü: altındaki ürün stackable mı ve max yük aşılıyor mu?
    internal static bool CheckStackingRules(
        ExtremePoint ep,
        Rotation rot,
        ItemSpec item,
        IReadOnlyList<PlacedItem> placed)
    {
        foreach (var p in placed)
        {
            if (Math.Abs((double)(p.Position.Z + p.Rotation.H - ep.Z)) > Epsilon)
                continue;

            decimal ix = IntersectLength(ep.X, ep.X + rot.L, p.Position.X, p.Position.X + p.Rotation.L);
            decimal iy = IntersectLength(ep.Y, ep.Y + rot.W, p.Position.Y, p.Position.Y + p.Rotation.W);

            if (ix <= 0 || iy <= 0)
                continue;

            if (!p.IsStackable)
                return false;

            if (p.CurrentStackLoad + item.Weight > p.MaxWeightOnTop)
                return false;
        }
        return true;
    }

    private static decimal IntersectLength(decimal a1, decimal a2, decimal b1, decimal b2)
    {
        decimal start = Math.Max(a1, b1);
        decimal end = Math.Min(a2, b2);
        return Math.Max(0m, end - start);
    }
}
