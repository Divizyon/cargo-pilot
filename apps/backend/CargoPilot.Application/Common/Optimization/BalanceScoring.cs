using CargoPilot.Domain.Enums;

namespace CargoPilot.Application.Common.Optimization;

/// <summary>
/// Ağırlık merkezi (CoG) modülü: aday pozisyonun denge cezası, kriterin kalibre
/// katsayısıyla ölçeklenmiş skor terimi ve greedy faz sonrası çalışan takas
/// tabanlı denge iyileştirici. Motordan çıkarılan saf fonksiyonlardır; durum
/// tutmaz.
///
/// Modülün açık/kapalı olması <see cref="Models.OptimizationModules.UseWeightBalance"/>
/// ile belirlenir; varsayılan türetme Lifo kriterinde kapalıdır (terim 0).
/// Katsayı yine kriterden gelir: Lifo için kalibre edilmiş bir denge katsayısı
/// olmadığından bayrak orada açılsa bile terim 0 kalır.
///
/// Tasarım kararı: hepsi <c>static</c>. Sıcak döngüde çağrıldıkları için
/// arayüz/delegate/DI üzerinden sanal çağrı bilinçli olarak kullanılmaz.
/// </summary>
internal static class BalanceScoring
{
    // Kalibre edilmiş katsayılar. VolumeFirst'te denge yalnızca eşit hacim
    // puanlı adaylar arasında ayrım yapar; WeightBalance'ta ise derinlik/genişlik
    // tercihlerini bastıracak kadar baskındır.
    private const decimal VolumeFirstCoefficient = 500m;
    private const decimal WeightBalanceCoefficient = 900_000m;

    /// <summary>
    /// Denge skor terimi: ceza × kriterin katsayısı. Modül kapalıyken ya da
    /// kriterin kalibre katsayısı yokken tam olarak <c>0m</c> döner; toplama
    /// sırası bozulmasın diye ceza hiç hesaplanmaz.
    /// </summary>
    internal static decimal Term(
        bool enabled,
        LoadingPlanOptimizationCriteria criteria,
        decimal ex, decimal ez, decimal w, decimal d,
        decimal itemWeight, decimal totalWeight,
        decimal momentX, decimal momentZ,
        decimal halfW, decimal halfL)
    {
        if (!enabled)
            return 0m;

        var coefficient = criteria switch
        {
            LoadingPlanOptimizationCriteria.VolumeFirst => VolumeFirstCoefficient,
            LoadingPlanOptimizationCriteria.WeightBalance => WeightBalanceCoefficient,
            _ => 0m, // Lifo: denge modülü kapalı
        };

        if (coefficient == 0m)
            return 0m;

        return BalancePenalty(ex, ez, w, d, itemWeight, totalWeight, momentX, momentZ, halfW, halfL)
             * coefficient;
    }

    /// <summary>
    /// Aday kutu yerleştirilseydi oluşacak ağırlık merkezinin araç ortasından
    /// normalize sapması. X ve Z eksenlerinin sapmaları toplanır; yükseklik
    /// (Y) dengeye katılmaz.
    /// </summary>
    internal static decimal BalancePenalty(
        decimal ex, decimal ez, decimal w, decimal d,
        decimal itemWeight, decimal totalWeight, decimal momentX, decimal momentZ,
        decimal halfW, decimal halfL)
    {
        var newTotal = totalWeight + itemWeight;

        decimal normDevX = 0m, normDevZ = 0m;
        if (newTotal > 0m && halfW > 0m && halfL > 0m)
        {
            var newCogX = (momentX + itemWeight * (ex + w / 2m)) / newTotal;
            var newCogZ = (momentZ + itemWeight * (ez + d / 2m)) / newTotal;
            normDevX = Math.Abs(newCogX - halfW) / halfW;
            normDevZ = Math.Abs(newCogZ - halfL) / halfL;
        }

        return normDevX + normDevZ;
    }

    // ── İkinci geçiş: greedy swap balance iyileştirici ───────────────────────
    //
    // Her turda tüm kutu çiftleri taranır. İki kutu pozisyon değiştirdiğinde
    // denge cezası azalıyorsa ve takas geçerliyse (sınır + çakışma + destek +
    // istif/kırılganlık kısıtları + üstteki kutuların desteği) takas kabul edilir.
    // En fazla maxPasses tur çalışır.
    internal static List<PlacedBox> ImproveBalance(
        List<PlacedBox> placements,
        decimal vW, decimal vH, decimal vL,
        decimal totalWeight, decimal halfW, decimal halfL,
        CancellationToken cancellationToken,
        int maxPasses = 3)
    {
        var current = placements.ToList();

        for (int pass = 0; pass < maxPasses; pass++)
        {
            // Her geçiş O(n²) çift dener; iptal edilen istekte kalan geçişler atlanır.
            cancellationToken.ThrowIfCancellationRequested();

            var improved = false;
            var bestPenalty = GlobalBalancePenalty(current, totalWeight, halfW, halfL);

            for (int i = 0; i < current.Count; i++)
            {
                for (int j = i + 1; j < current.Count; j++)
                {
                    var a = current[i];
                    var b = current[j];

                    // Sınır kontrolü: a, b'nin yerine sığıyor mu?
                    if (b.X + a.W > vW || b.Y + a.H > vH || b.Z + a.D > vL) continue;
                    // Sınır kontrolü: b, a'nın yerine sığıyor mu?
                    if (a.X + b.W > vW || a.Y + b.H > vH || a.Z + b.D > vL) continue;

                    var swapped = current.ToList();
                    swapped[i] = a with { X = b.X, Y = b.Y, Z = b.Z };
                    swapped[j] = b with { X = a.X, Y = a.Y, Z = a.Z };

                    if (!SwapIsValid(swapped, i, j)) continue;

                    var newPenalty = GlobalBalancePenalty(swapped, totalWeight, halfW, halfL);
                    if (newPenalty < bestPenalty - 0.001m)
                    {
                        current      = swapped;
                        bestPenalty  = newPenalty;
                        improved     = true;
                    }
                }
            }

            if (!improved) break;
        }

        return current;
    }

    // Takas sonrası i ve j kutularının geçerli olup olmadığını doğrular:
    // çakışma yok + zemin üzerinde veya %80 destek alıyor + istif/kırılganlık
    // kısıtları hem aşağı hem yukarı yönde sağlanıyor + eski üst yüzeylerde
    // duran kutuların desteği korunuyor.
    private static bool SwapIsValid(
        List<PlacedBox> placements, int i, int j)
    {
        var a = placements[i];
        var b = placements[j];

        // a ve b takas sonrası birbirinin üstünde, altında ya da yanında olabilir;
        // bu yüzden her kutu DİĞERİNİ GÖREREK doğrulanır. othersA yalnızca a'yı,
        // othersB yalnızca b'yi dışlar — böylece a↔b ilişkisi altı kısıtın
        // tamamında test edilir.
        var othersA = placements.Where((_, k) => k != i).ToList();
        var othersB = placements.Where((_, k) => k != j).ToList();

        // Çakışma kontrolü. a↔b çifti birinci taramada zaten test edilir; ikinci
        // taramadaki tekrar zararsızdır.
        if (othersA.Exists(c => PlacementValidator.BoxesOverlap(a, c))) return false;
        if (othersB.Exists(c => PlacementValidator.BoxesOverlap(b, c))) return false;

        // Destek kontrolü
        if (!PlacementValidator.HasSupportFor(a, othersA)) return false;
        if (!PlacementValidator.HasSupportFor(b, othersB)) return false;

        // Takas sonrası istif kısıtı kontrolü. İstiflenebilirlik de burada
        // doğrulanır; aksi hâlde denge iyileştirmesi bir kutuyu istiflenemez
        // kutunun üstüne taşıyabiliyordu.
        if (PlacementValidator.ViolatesStackability(othersA, a.X, a.Y, a.Z, a.W, a.D)) return false;
        if (PlacementValidator.ViolatesStackability(othersB, b.X, b.Y, b.Z, b.W, b.D)) return false;
        if (PlacementValidator.ViolatesStackCount(othersA, a.X, a.Y, a.Z, a.W, a.D)) return false;
        if (PlacementValidator.ViolatesStackCount(othersB, b.X, b.Y, b.Z, b.W, b.D)) return false;
        if (PlacementValidator.ViolatesStackWeight(othersA, a.X, a.Y, a.Z, a.W, a.D, a.Weight)) return false;
        if (PlacementValidator.ViolatesStackWeight(othersB, b.X, b.Y, b.Z, b.W, b.D, b.Weight)) return false;

        // Kırılganlık da sert kısıttır: takas bir kutuyu kırılgan kutunun üstüne
        // taşıyamaz. Motorun aday taramasındaki kuralın aynısı burada da geçerlidir
        if (PlacementValidator.ViolatesFragility(othersA, a.X, a.Y, a.Z, a.W, a.D)) return false;
        if (PlacementValidator.ViolatesFragility(othersB, b.X, b.Y, b.Z, b.W, b.D)) return false;

        // Yukarıdaki dört kısıt yalnızca AŞAĞI bakar (bkz. PlacementValidator
        // satır 100/128/156/198). Takas bir kutuyu var olan bir yığının ALTINA
        // taşıyabildiği için taşıyıcı yönü de sorulmalıdır.
        if (PlacementValidator.ViolatesLoadAbove(othersA, a)) return false;
        if (PlacementValidator.ViolatesLoadAbove(othersB, b)) return false;

        // Takas yalnızca a ve b'nin ESKİ üst yüzeylerindeki desteği azaltabilir,
        // yeni üst yüzeylerde destek yalnızca eklenir. Takas sonrası a, B'nin eski
        // yüksekliğine oturduğu için aşağıdaki iki seviye A ve B'nin eski üst
        // yüzeyleridir, simetrik olarak b için de aynısı geçerlidir. Bu iki
        // seviyelik küme tamdır, ama yükseklikler eşit olsa bile kontrol
        // atlanamaz çünkü kutuların taban ALANI birbirinden farklı olabilir.
        var oldATopY = b.Y + a.H;
        var oldBTopY = a.Y + b.H;

        for (int k = 0; k < placements.Count; k++)
        {
            if (k == i || k == j) continue;
            var c = placements[k];
            if (c.Y != oldATopY && c.Y != oldBTopY) continue;

            var supportersOfC = placements.Where((_, m) => m != k).ToList();
            if (!PlacementValidator.HasSupportFor(c, supportersOfC)) return false;
        }

        return true;
    }

    /// <summary>
    /// Yerleşimin tamamının denge cezası: CoG'nin araç ortasından normalize
    /// X + Z sapması. Takas iyileştiricisinin hedef fonksiyonudur.
    /// </summary>
    private static decimal GlobalBalancePenalty(
        List<PlacedBox> placements, decimal totalWeight,
        decimal halfW, decimal halfL)
    {
        if (totalWeight == 0m || halfW == 0m || halfL == 0m) return 0m;
        var cogX = placements.Sum(p => p.Weight * (p.X + p.W / 2m)) / totalWeight;
        var cogZ = placements.Sum(p => p.Weight * (p.Z + p.D / 2m)) / totalWeight;
        return Math.Abs(cogX - halfW) / halfW + Math.Abs(cogZ - halfL) / halfL;
    }
}
