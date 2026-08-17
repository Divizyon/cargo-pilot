using CargoPilot.Application.Common.Models;
using CargoPilot.Domain.Enums;

namespace CargoPilot.Application.Common.Optimization;

/// <summary>
/// Yerleştirmenin sert kısıtları: çakışma, zemin desteği, istif ve kırılganlık kuralları.
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
        decimal width, decimal height, decimal length,
        PlacedBox b) =>
        x < b.X + b.Width && x + width > b.X &&
        y < b.Y + b.Height && y + height > b.Y &&
        z < b.Z + b.Length && z + length > b.Z;

    /// <summary>Aday pozisyon yerleştirilmiş kutulardan herhangi biriyle çakışıyor mu?</summary>
    // S3267: Sonar bu döngü için LINQ (Any/Where) önerir. Burası motorun en sıcak
    // yolu — her aday pozisyon × her yönelim için çalışır — ve LINQ'in enumerator
    // + closure maliyeti bilinçli olarak alınmaz. Döngü elle yazılı kalır.
#pragma warning disable S3267
    internal static bool HasOverlap(
        List<PlacedBox> placed,
        decimal x, decimal y, decimal z,
        decimal width, decimal height, decimal length)
    {
        foreach (var b in placed)
        {
            if (Intersects(x, y, z, width, height, length, b))
                return true;
        }
        return false;
    }
#pragma warning restore S3267

    /// <summary>Yerleştirilmiş iki kutu birbiriyle çakışıyor mu?</summary>
    internal static bool BoxesOverlap(PlacedBox a, PlacedBox b) =>
        Intersects(a.X, a.Y, a.Z, a.Width, a.Height, a.Length, b);

    // ── Support ───────────────────────────────────────────────────────────────
    //
    // %80 zemin desteği kuralının TEK kaynağı. Zemindeki kutu (y == 0) ve sıfır
    // taban alanı her zaman desteklidir. Yalnızca üst yüzeyi tam olarak aday
    // tabanına denk gelen kutular destek sayılır; eşik 0.80'dir.

    /// <summary>Aday pozisyon zeminde mi ya da altındaki kutulardan yeterli destek alıyor mu?</summary>
    internal static bool HasSupport(
        List<PlacedBox> placed,
        decimal x, decimal y, decimal z,
        decimal width, decimal length)
        => HasSupport(placed, x, y, z, width, length, SupportThreshold);

    /// <summary>
    /// Ayni soru, esigi disaridan verilerek. Esik bir FIZIK KANUNU DEGIL, bir
    /// POLITIKA (ALGORITMA-RULEBOOK.md DR-16): kimse olcup "%80 olmali" demedi.
    /// Olcum bu kuralin en buyuk tikac oldugunu gosterdi — yerlesemeyen
    /// kutularin %72,7'si bir bosluga sigiyor ama yalnizca %3,2'si orada destek
    /// buluyor.
    ///
    /// Parametrelesme, esigi DEGISTIRMEK icin degil OLCMEK icin: uretim
    /// varsayilani <see cref="SupportThreshold"/>'da durur ve hicbir cagri yolu
    /// bugunku davranistan sapmaz. Musteri karari sayi olmadan verilemez.
    /// </summary>
    internal static bool HasSupport(
        List<PlacedBox> placed,
        decimal x, decimal y, decimal z,
        decimal width, decimal length,
        decimal threshold)
        => SupportRatio(placed, x, y, z, width, length) >= threshold;

    /// <summary>Asgari destek orani. Esik burada tek yerde durur.</summary>
    internal const decimal SupportThreshold = 0.80m;

    /// <summary>Girdi bir esik tasimiyorsa yururlukteki deger.</summary>
    internal static decimal ThresholdOf(OptimizationInput input)
        => input?.SupportThreshold ?? SupportThreshold;

    /// <summary>
    /// Aday pozisyonun taban alaninin ne kadari destekli. Zeminde ve sifir taban
    /// alaninda 1.
    ///
    /// Esikten ayri durur cunku esik "gecer mi" sorusunun cevabi, oran ise
    /// "ne kadar" sorusunun. Bosluk defteri ikincisine ihtiyac duyar: bir
    /// bosluğun tabanini TAM destekli bolgeye kirpmak icin orani bilmek gerekir
    /// (ALGORITMA-RULEBOOK.md R-C09a).
    /// </summary>
    internal static decimal SupportRatio(
        List<PlacedBox> placed,
        decimal x, decimal y, decimal z,
        decimal width, decimal length)
    {
        if (y == 0m) return 1m;

        var footprint = width * length;
        if (footprint == 0m) return 1m;

        var supportedArea = 0m;
        foreach (var b in placed)
        {
            if (b.Y + b.Height != y) continue;
            var overlapX = Math.Max(0m, Math.Min(x + width, b.X + b.Width) - Math.Max(x, b.X));
            var overlapZ = Math.Max(0m, Math.Min(z + length, b.Z + b.Length) - Math.Max(z, b.Z));
            supportedArea += overlapX * overlapZ;
        }

        return supportedArea / footprint;
    }

    /// <summary>Yerleştirilmiş bir kutunun, kendisi hariç diğerlerinden destek alma kontrolü.</summary>
    internal static bool HasSupportFor(PlacedBox box, List<PlacedBox> others) =>
        HasSupport(others, box.X, box.Y, box.Z, box.Width, box.Length);

    // ── Stack ─────────────────────────────────────────────────────────────────
    //
    // İstif kuralları: istiflenebilirlik (+ LIFO iniş sırası), azami istif adedi
    // ve üste binen azami ağırlık.

    /// <summary>Aday pozisyonun hemen altındaki kutular istiflemeye izin veriyor mu?</summary>
    internal static bool ViolatesStackability(
        List<PlacedBox> placed,
        decimal x, decimal y, decimal z,
        decimal width, decimal length,
        int? newItemUnloadingOrder = null)
    {
        foreach (var b in placed)
        {
            if (b.Y + b.Height != y) continue;
            var overlapX = Math.Max(0m, Math.Min(x + width, b.X + b.Width) - Math.Max(x, b.X));
            var overlapZ = Math.Max(0m, Math.Min(z + length, b.Z + b.Length) - Math.Max(z, b.Z));
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
        decimal width, decimal length)
    {
        foreach (var b in placed)
        {
            if (b.MaxStackCount <= 0) continue;
            if (b.Y + b.Height > y) continue;

            var ox = Math.Max(0m, Math.Min(x + width, b.X + b.Width) - Math.Max(x, b.X));
            var oz = Math.Max(0m, Math.Min(z + length, b.Z + b.Length) - Math.Max(z, b.Z));
            if (ox <= 0m || oz <= 0m) continue;

            var countAbove = placed.Count(c =>
                c.Y >= b.Y + b.Height &&
                Math.Max(0m, Math.Min(c.X + c.Width, b.X + b.Width) - Math.Max(c.X, b.X)) > 0m &&
                Math.Max(0m, Math.Min(c.Z + c.Length, b.Z + b.Length) - Math.Max(c.Z, b.Z)) > 0m);

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
        decimal width, decimal length,
        decimal newWeight)
    {
        foreach (var b in placed)
        {
            if (b.MaxWeightOnTop <= 0m) continue;
            if (b.Y + b.Height > y) continue;

            var ox = Math.Max(0m, Math.Min(x + width, b.X + b.Width) - Math.Max(x, b.X));
            var oz = Math.Max(0m, Math.Min(z + length, b.Z + b.Length) - Math.Max(z, b.Z));
            if (ox <= 0m || oz <= 0m) continue;

            var weightAbove = placed
                .Where(c =>
                    c.Y >= b.Y + b.Height &&
                    Math.Max(0m, Math.Min(c.X + c.Width, b.X + b.Width) - Math.Max(c.X, b.X)) > 0m &&
                    Math.Max(0m, Math.Min(c.Z + c.Length, b.Z + b.Length) - Math.Max(c.Z, b.Z)) > 0m)
                .Sum(c => c.Weight);

            if (weightAbove + newWeight > b.MaxWeightOnTop) return true;
        }
        return false;
    }

    // ── Fragility ─────────────────────────────────────────────────────────────
    //
    // Kırılganlık kuralı: kırılgan bir ürünün üstüne hiçbir yük konamaz.
    //
    // Yalnızca <c>FragilityType.Fragile</c> mekanik kırılganlığı ifade eder.
    // Enum'un kalan üyeleri (LiquidChemical, Flammable, Oxidizing, Corrosive,
    // OdorSensitive, FoodContact, KeepDry, Chemical) sıralı bir şiddet ölçeği
    // değil, ayrışım/elleçleme sınıflarıdır; onların kuralı stackGroup ve
    // incompatibleGroups üzerinden ContaminationFilter'da işler. Bu yüzden
    // burada kırılganlık dereceli bir ağırlık sınırına çevrilmez: dereceli
    // sınır zaten MaxWeightOnTop alanıdır ve ViolatesStackWeight uygular.
    // Kırılganlığın eklediği şey kategorik durumdur — üste hiçbir şey konamaz

    /// <summary>Aday pozisyonun altında kalan kutulardan biri kırılgan mı?</summary>
    internal static bool ViolatesFragility(
        List<PlacedBox> placed,
        decimal x, decimal y, decimal z,
        decimal width, decimal length)
    {
        foreach (var b in placed)
        {
            // En ucuz eleme önce: araçta kırılgan kutu yoksa döngü kutu başına
            // tek enum karşılaştırmasına iner
            if (b.FragilityType != FragilityType.Fragile) continue;
            if (b.Y + b.Height > y) continue;

            var ox = Math.Max(0m, Math.Min(x + width, b.X + b.Width) - Math.Max(x, b.X));
            var oz = Math.Max(0m, Math.Min(z + length, b.Z + b.Length) - Math.Max(z, b.Z));
            if (ox <= 0m || oz <= 0m) continue;

            return true;
        }
        return false;
    }

    // ── Load above (taşıyıcı rolü) ────────────────────────────────────────────
    //
    // Yukarıdaki dört kural (istiflenebilirlik, istif adedi, üst ağırlık,
    // kırılganlık) yalnızca AŞAĞI bakar: aday pozisyonun ALTINDA ne olduğunu
    // sorar. Aday taraması için bu yeterlidir, çünkü yeni kutu daima mevcut
    // yığının en üstüne konur; üstünde hiçbir şey yoktur. Denge takası ise bir
    // kutuyu var olan bir yığının ALTINA taşıyabilir — o durumda kutunun KENDİ
    // IsStackable / FragilityType / MaxStackCount / MaxWeightOnTop kısıtları
    // hiçbir yerde değerlendirilmez. Bu fonksiyon o kör noktayı kapatır:
    // kutunun ÜSTÜNDEKİ yükü kutunun kendi kısıtlarına karşı sorar.
    //
    // Semantik, aşağı bakan aynalarıyla birebir hizalıdır: istiflenebilirlik tam
    // temas (satır 100+105), kırılganlık sütun geneli (satır 197-198), istif adedi
    // ve üst ağırlık sütun geneli (satır 128/156). Kutu zaten yerleşik olduğu için
    // adet karşılaştırmasında satır 139'daki "+1" yoktur.

    /// <summary>Yerleştirilmiş bir kutunun üstündeki yük, kutunun kendi istif ve kırılganlık kısıtlarını aşıyor mu?</summary>
    internal static bool ViolatesLoadAbove(List<PlacedBox> others, PlacedBox box)
        => ViolatesLoadAbove(
            others, box.X, box.Y, box.Z, box.Width, box.Height, box.Length,
            box.IsStackable, box.FragilityType, box.MaxStackCount, box.MaxWeightOnTop);

    /// <summary>
    /// Aynı soru, henüz yerleşmemiş bir ADAY için. Aday taraması bunu sormak
    /// zorundadır: "yeni kutu daima yığının en üstüne konur" varsayımı yanlıştır,
    /// çünkü boşluk defteri iki kutu arasında kalan cebi aday olarak tutar — bu
    /// onun asıl amacıdır. Ölçüldü: köprü altındaki cebe kırılgan kutu
    /// yerleşiyordu (OPT-15).
    /// </summary>
    internal static bool ViolatesLoadAbove(
        List<PlacedBox> others,
        decimal x, decimal y, decimal z,
        decimal width, decimal height, decimal length,
        bool isStackable, FragilityType fragilityType, int maxStackCount, decimal maxWeightOnTop)
    {
        // Kısıtsız kutuda hiçbir kural üst yükle ilgilenmez: maliyet sıfır.
        if (isStackable
            && fragilityType != FragilityType.Fragile
            && maxStackCount <= 0
            && maxWeightOnTop <= 0m)
            return false;

        var top = y + height;

        var countAbove = 0;
        var weightAbove = 0m;
        var restsDirectlyOn = false;

        foreach (var c in others)
        {
            if (c.Y < top) continue;

            var ox = Math.Max(0m, Math.Min(x + width, c.X + c.Width) - Math.Max(x, c.X));
            var oz = Math.Max(0m, Math.Min(z + length, c.Z + c.Length) - Math.Max(z, c.Z));
            if (ox <= 0m || oz <= 0m) continue;

            countAbove++;
            weightAbove += c.Weight;
            if (c.Y == top) restsDirectlyOn = true;
        }

        if (!isStackable && restsDirectlyOn) return true;
        if (fragilityType == FragilityType.Fragile && countAbove > 0) return true;
        if (maxStackCount > 0 && countAbove > maxStackCount) return true;
        if (maxWeightOnTop > 0m && weightAbove > maxWeightOnTop) return true;

        return false;
    }

    // ── Orientation ───────────────────────────────────────────────────────────
    //
    // Rotasyon üretimi de bir yerleştirme kısıtıdır: hangi yönlerin denenebileceğini
    // belirler. Motorun içinde örtük kalmaması için validator'a taşınmıştır.

    /// <summary>Ürünün izin verilen rotasyonlarına göre denenecek (w, h, d) yönelimleri.</summary>
    internal static (decimal width, decimal height, decimal length, LoadingPlanPlacementRotation rotation)[]
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
