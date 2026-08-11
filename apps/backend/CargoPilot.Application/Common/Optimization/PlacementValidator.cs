using CargoPilot.Application.Common.Models;
using CargoPilot.Domain.Enums;

namespace CargoPilot.Application.Common.Optimization;

/// <summary>
/// Yerleştirmenin sert kısıtları: çakışma, zemin desteği ve istif kuralları.
/// Motordan çıkarılan saf fonksiyonlardır; durum tutmaz, sıra bağımlılığı yoktur.
///
/// Tasarım kararı: hepsi <c>static</c>. Sıcak döngüde milyonlarca kez çağrıldıkları
/// için arayüz/delegate/DI üzerinden sanal çağrı bilinçli olarak kullanılmaz.
/// </summary>
internal static class PlacementValidator
{
    // ── Collision ─────────────────────────────────────────────────────────────
    //
    // Eksen hizalı kesişim (AABB) testinin TEK kaynağı. Daha önce iki ayrı
    // imzada (aday pozisyon ve kutu-kutu) iki kez yazılmıştı; ikisi de artık
    // bu çekirdeği çağırır. Karşılaştırmalar kesin eşitsizliktir: yüzeylerin
    // temas etmesi çakışma sayılmaz.

    private static bool Intersects(
        decimal x, decimal y, decimal z,
        decimal w, decimal h, decimal d,
        PlacedBox b) =>
        x < b.X + b.W && x + w > b.X &&
        y < b.Y + b.H && y + h > b.Y &&
        z < b.Z + b.D && z + d > b.Z;

    /// <summary>Aday pozisyon yerleştirilmiş kutulardan herhangi biriyle çakışıyor mu?</summary>
    // S3267: Sonar bu döngü için LINQ (Any/Where) önerir. Burası motorun en sıcak
    // yolu — her aday pozisyon × her yönelim için çalışır — ve LINQ'in enumerator
    // + closure maliyeti bilinçli olarak alınmaz. Döngü elle yazılı kalır.
#pragma warning disable S3267
    internal static bool HasOverlap(
        List<PlacedBox> placed,
        decimal x, decimal y, decimal z,
        decimal w, decimal h, decimal d)
    {
        foreach (var b in placed)
        {
            if (Intersects(x, y, z, w, h, d, b))
                return true;
        }
        return false;
    }
#pragma warning restore S3267

    /// <summary>Yerleştirilmiş iki kutu birbiriyle çakışıyor mu?</summary>
    internal static bool BoxesOverlap(PlacedBox a, PlacedBox b) =>
        Intersects(a.X, a.Y, a.Z, a.W, a.H, a.D, b);

    // ── Support ───────────────────────────────────────────────────────────────
    //
    // %80 zemin desteği kuralının TEK kaynağı. Zemindeki kutu (y == 0) ve sıfır
    // taban alanı her zaman desteklidir. Yalnızca üst yüzeyi tam olarak aday
    // tabanına denk gelen kutular destek sayılır; eşik 0.80'dir.

    /// <summary>Aday pozisyon zeminde mi ya da altındaki kutulardan yeterli destek alıyor mu?</summary>
    internal static bool HasSupport(
        List<PlacedBox> placed,
        decimal x, decimal y, decimal z,
        decimal w, decimal d)
    {
        if (y == 0m) return true;

        var footprint = w * d;
        if (footprint == 0m) return true;

        var supportedArea = 0m;
        foreach (var b in placed)
        {
            if (b.Y + b.H != y) continue;
            var overlapX = Math.Max(0m, Math.Min(x + w, b.X + b.W) - Math.Max(x, b.X));
            var overlapZ = Math.Max(0m, Math.Min(z + d, b.Z + b.D) - Math.Max(z, b.Z));
            supportedArea += overlapX * overlapZ;
        }

        return supportedArea / footprint >= 0.80m;
    }

    /// <summary>Yerleştirilmiş bir kutunun, kendisi hariç diğerlerinden destek alma kontrolü.</summary>
    internal static bool HasSupportFor(PlacedBox box, List<PlacedBox> others) =>
        HasSupport(others, box.X, box.Y, box.Z, box.W, box.D);

    // ── Stack ─────────────────────────────────────────────────────────────────
    //
    // İstif kuralları: istiflenebilirlik (+ LIFO iniş sırası), azami istif adedi
    // ve üste binen azami ağırlık.

    /// <summary>Aday pozisyonun hemen altındaki kutular istiflemeye izin veriyor mu?</summary>
    internal static bool ViolatesStackability(
        List<PlacedBox> placed,
        decimal x, decimal y, decimal z,
        decimal w, decimal d,
        int? newItemUnloadingOrder = null)
    {
        foreach (var b in placed)
        {
            if (b.Y + b.H != y) continue;
            var overlapX = Math.Max(0m, Math.Min(x + w, b.X + b.W) - Math.Max(x, b.X));
            var overlapZ = Math.Max(0m, Math.Min(z + d, b.Z + b.D) - Math.Max(z, b.Z));
            if (overlapX <= 0m || overlapZ <= 0m) continue;

            if (!b.IsStackable) return true;

            // LIFO stack kuralı: daha geç inen ürün, daha erken inenin üstüne konamaz.
            // Yön semantiği için bkz. LifoPlacement.CompareUnloadingOrder — aynı
            // semantik grup sıralamasında ve bölge sıralamasında da paylaşılır.
            // Bu dikey kural fiziksel geçerlilikle iç içe olduğu için burada kalır.
            if (newItemUnloadingOrder.HasValue && b.UnloadingOrder.HasValue
                && LifoPlacement.CompareUnloadingOrder(newItemUnloadingOrder.Value, b.UnloadingOrder.Value) > 0)
                return true;
        }
        return false;
    }

    // Yerleştirilecek ürünün altındaki her kutu için: o kutunun üzerinde halihazırda
    // kaç ürün var, +1 (yeni ürün) MaxStackCount'u aşıyor mu?
    internal static bool ViolatesStackCount(
        List<PlacedBox> placed,
        decimal x, decimal y, decimal z,
        decimal w, decimal d)
    {
        foreach (var b in placed)
        {
            if (b.MaxStackCount <= 0) continue;
            if (b.Y + b.H > y) continue;

            var ox = Math.Max(0m, Math.Min(x + w, b.X + b.W) - Math.Max(x, b.X));
            var oz = Math.Max(0m, Math.Min(z + d, b.Z + b.D) - Math.Max(z, b.Z));
            if (ox <= 0m || oz <= 0m) continue;

            var countAbove = placed.Count(c =>
                c.Y >= b.Y + b.H &&
                Math.Max(0m, Math.Min(c.X + c.W, b.X + b.W) - Math.Max(c.X, b.X)) > 0m &&
                Math.Max(0m, Math.Min(c.Z + c.D, b.Z + b.D) - Math.Max(c.Z, b.Z)) > 0m);

            if (countAbove + 1 > b.MaxStackCount) return true;
        }
        return false;
    }

    // Yerleştirilecek ürünün altındaki her kutu için: o kutunun üzerindeki mevcut
    // toplam ağırlık + yeni ürünün ağırlığı MaxWeightOnTop'u aşıyor mu?
    // Yalnızca bir altındakini değil, altındaki tüm kutuları kontrol eder.
    internal static bool ViolatesStackWeight(
        List<PlacedBox> placed,
        decimal x, decimal y, decimal z,
        decimal w, decimal d,
        decimal newWeight)
    {
        foreach (var b in placed)
        {
            if (b.MaxWeightOnTop <= 0m) continue;
            if (b.Y + b.H > y) continue;

            var ox = Math.Max(0m, Math.Min(x + w, b.X + b.W) - Math.Max(x, b.X));
            var oz = Math.Max(0m, Math.Min(z + d, b.Z + b.D) - Math.Max(z, b.Z));
            if (ox <= 0m || oz <= 0m) continue;

            var weightAbove = placed
                .Where(c =>
                    c.Y >= b.Y + b.H &&
                    Math.Max(0m, Math.Min(c.X + c.W, b.X + b.W) - Math.Max(c.X, b.X)) > 0m &&
                    Math.Max(0m, Math.Min(c.Z + c.D, b.Z + b.D) - Math.Max(c.Z, b.Z)) > 0m)
                .Sum(c => c.Weight);

            if (weightAbove + newWeight > b.MaxWeightOnTop) return true;
        }
        return false;
    }

    // ── Orientation ───────────────────────────────────────────────────────────
    //
    // Rotasyon üretimi de bir yerleştirme kısıtıdır: hangi yönlerin denenebileceğini
    // belirler. Motorun içinde örtük kalmaması için validator'a taşınmıştır.

    /// <summary>Ürünün izin verilen rotasyonlarına göre denenecek (w, h, d) yönelimleri.</summary>
    internal static (decimal w, decimal h, decimal d, LoadingPlanPlacementRotation rotation)[]
        GetOrientations(OptimizationItemInput item)
    {
        var (W, H, L) = (item.Width, item.Height, item.Length);

        return item.AllowedRotations switch
        {
            AllowedRotations.Fixed =>
            [
                (W, H, L, LoadingPlanPlacementRotation.NoRotation)
            ],
            AllowedRotations.NoVertical =>
            [
                (W, H, L, LoadingPlanPlacementRotation.NoRotation),
                (L, H, W, LoadingPlanPlacementRotation.Yaw)
            ],
            // Yaw yasak; Roll ve Pitch serbest.
            AllowedRotations.NoYaw =>
            [
                (W, H, L, LoadingPlanPlacementRotation.NoRotation),
                (H, W, L, LoadingPlanPlacementRotation.Roll),
                (W, L, H, LoadingPlanPlacementRotation.Pitch)
            ],
            // W her zaman X ekseninde — sadece Pitch (H↔L, W sabit).
            AllowedRotations.PitchOnly =>
            [
                (W, H, L, LoadingPlanPlacementRotation.NoRotation),
                (W, L, H, LoadingPlanPlacementRotation.Pitch)
            ],
            // L her zaman Z ekseninde — sadece Roll (H↔W, L sabit).
            AllowedRotations.RollOnly =>
            [
                (W, H, L, LoadingPlanPlacementRotation.NoRotation),
                (H, W, L, LoadingPlanPlacementRotation.Roll)
            ],
            _ =>
            [
                (W, H, L, LoadingPlanPlacementRotation.NoRotation),
                (L, H, W, LoadingPlanPlacementRotation.Yaw),
                (H, W, L, LoadingPlanPlacementRotation.Roll),
                (W, L, H, LoadingPlanPlacementRotation.Pitch),
                (H, L, W, LoadingPlanPlacementRotation.YawPitch),
                (L, W, H, LoadingPlanPlacementRotation.RollYaw)
            ]
        };
    }
}
