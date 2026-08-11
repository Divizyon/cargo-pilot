using CargoPilot.Domain.Enums;

namespace CargoPilot.Application.Common.Optimization;

/// <summary>
/// Ağırlık merkezi (CoG) modülü: aday pozisyonun denge cezası, kriterin kalibre
/// katsayısıyla ölçeklenmiş skor terimi ve greedy faz sonrası çalışan takas
/// tabanlı denge iyileştirici. Motordan çıkarılan saf fonksiyonlardır; durum
/// tutmaz.
///
/// Modül Lifo kriterinde kapalıdır (terim 0).
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
    /// Denge skor terimi: ceza × kriterin katsayısı. Modülün kapalı olduğu
    /// kriterde tam olarak <c>0m</c> döner; toplama sırası bozulmasın diye ceza
    /// hiç hesaplanmaz.
    /// </summary>
    internal static decimal Term(
        LoadingPlanOptimizationCriteria criteria,
        decimal ex, decimal ez, decimal w, decimal d,
        decimal itemWeight, decimal totalWeight,
        decimal momentX, decimal momentZ,
        decimal halfW, decimal halfL)
    {
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
    // denge cezası azalıyorsa ve takas geçerliyse (sınır + çakışma + destek)
    // takas kabul edilir. En fazla maxPasses tur çalışır.
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
    // çakışma yok + zemin üzerinde veya %80 destek alıyor.
    private static bool SwapIsValid(
        List<PlacedBox> placements, int i, int j)
    {
        var a = placements[i];
        var b = placements[j];

        // Diğer kutularla çakışma kontrolü (i ve j hariç)
        for (int k = 0; k < placements.Count; k++)
        {
            if (k == i || k == j) continue;
            var c = placements[k];

            if (PlacementValidator.BoxesOverlap(a, c) || PlacementValidator.BoxesOverlap(b, c)) return false;
        }

        // Destek kontrolü
        var others = placements.Where((_, k) => k != i && k != j).ToList();
        if (!PlacementValidator.HasSupportFor(a, others)) return false;
        if (!PlacementValidator.HasSupportFor(b, others)) return false;

        // Takas sonrası istif kısıtı kontrolü: i ve j kendileri hariç tutularak
        // kontrol edilir (others zaten bu listeyi oluşturmuş durumda).
        // İstiflenebilirlik de burada doğrulanır; aksi hâlde denge iyileştirmesi
        // bir kutuyu istiflenemez kutunun üstüne taşıyabiliyordu.
        if (PlacementValidator.ViolatesStackability(others, a.X, a.Y, a.Z, a.W, a.D)) return false;
        if (PlacementValidator.ViolatesStackability(others, b.X, b.Y, b.Z, b.W, b.D)) return false;
        if (PlacementValidator.ViolatesStackCount(others, a.X, a.Y, a.Z, a.W, a.D)) return false;
        if (PlacementValidator.ViolatesStackCount(others, b.X, b.Y, b.Z, b.W, b.D)) return false;
        if (PlacementValidator.ViolatesStackWeight(others, a.X, a.Y, a.Z, a.W, a.D, a.Weight)) return false;
        if (PlacementValidator.ViolatesStackWeight(others, b.X, b.Y, b.Z, b.W, b.D, b.Weight)) return false;

        // Yükseklikler farklıysa: eski konumların üstündeki kutular havada kalabilir.
        // a, B'nin eski Y'sindedir (a.Y = B_eski.Y); a.H = A'nın yüksekliği → A'nın eski üst yüzeyi = b.Y + a.H
        // b, A'nın eski Y'sindedir (b.Y = A_eski.Y); b.H = B'nin yüksekliği → B'nin eski üst yüzeyi = a.Y + b.H
        if (a.H != b.H)
        {
            var oldATopY = b.Y + a.H;
            var oldBTopY = a.Y + b.H;

            foreach (var c in others)
            {
                if (c.Y != oldATopY && c.Y != oldBTopY) continue;
                var supportersOfC = others.Where(p => p != c).Append(a).Append(b).ToList();
                if (!PlacementValidator.HasSupportFor(c, supportersOfC)) return false;
            }
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
