using CargoPilot.Application.Common.Interfaces;
using CargoPilot.Application.Common.Models;
using CargoPilot.Domain.Enums;

namespace CargoPilot.Infrastructure.Services;

internal sealed class OptimizationEngine : IOptimizationEngine
{
    public OptimizationResult Run(OptimizationInput input, CancellationToken cancellationToken = default)
    {
        var placements = new List<PlacedBox>();
        var unplaced = new List<UnplacedBox>();
        var totalWeight = 0m;

        var momentX = 0m;
        var momentZ = 0m;

        var expanded = input.Items
            .SelectMany(i => Enumerable.Range(0, i.Quantity).Select(_ => i));

        var instances = SortForGroupPlacement(expanded, input.Criteria, input.ClusterGroups);

        var halfW = input.VehicleWidth  / 2m;
        var halfL = input.VehicleLength / 2m;

        // ── Extreme-point tohumu ──────────────────────────────────────────────
        // WeightBalance: aracın 4 kat-zemin köşesi tohumlanır; aksi hâlde greedy
        // her zaman (0,0,0) yakınına yığılır ve ön-arka/sol-sağ denge bozulur.
        var extremePoints = new HashSet<(decimal x, decimal y, decimal z)> { (0m, 0m, 0m) };
        if (input.Criteria == LoadingPlanOptimizationCriteria.WeightBalance
            && halfW > 0m && halfL > 0m)
        {
            extremePoints.Add((halfW, 0m, 0m));    // arka-sağ
            extremePoints.Add((0m,    0m, halfL)); // ön-sol
            extremePoints.Add((halfW, 0m, halfL)); // ön-sağ
        }

        var groupZones = ComputeGroupZones(instances, input.VehicleLength, input.LoadingType, input.Criteria);

        foreach (var item in instances)
        {
            // Her kutu için aday pozisyon taraması pahalıdır; iptal edilen istekte
            // döngünün sonuna kadar çalışmaya devam edilmez.
            cancellationToken.ThrowIfCancellationRequested();

            if (totalWeight + item.Weight > input.VehicleMaxWeight)
            {
                unplaced.Add(new UnplacedBox(item.ItemId, UnplacedReason.WeightLimitExceeded));
                continue;
            }

            decimal? zoneStart = null;
            decimal? zoneEnd = null;
            if (groupZones.TryGetValue(item.UnloadingOrder ?? -1, out var zone))
            {
                zoneStart = zone.ZStart;
                zoneEnd = zone.ZEnd;
            }

            PlacedBox? best = null;
            var bestScore = decimal.MaxValue;

            foreach (var (ex, ey, ez) in extremePoints.OrderBy(p => p.y).ThenBy(p => p.z).ThenBy(p => p.x))
            {
                foreach (var (w, h, d, rotation) in GetOrientations(item))
                {
                    if (ex + w > input.VehicleWidth)  continue;
                    if (ey + h > input.VehicleHeight) continue;
                    if (ez + d > input.VehicleLength) continue;

                    if (HasOverlap(placements, ex, ey, ez, w, h, d)) continue;
                    if (!HasSupport(placements, ex, ey, ez, w, d))   continue;
                    if (ViolatesStackability(placements, ex, ey, ez, w, d,
                        input.Criteria == LoadingPlanOptimizationCriteria.Lifo ? item.UnloadingOrder : null)) continue;
                    if (ViolatesStackCount(placements, ex, ey, ez, w, d)) continue;
                    if (ViolatesStackWeight(placements, ex, ey, ez, w, d, item.Weight)) continue;

                    var score = ComputeScore(
                        input.Criteria,
                        ex, ey, ez, w, d,
                        item.Weight, totalWeight,
                        momentX, momentZ,
                        halfW, halfL,
                        zoneStart, zoneEnd);

                    if (score < bestScore)
                    {
                        bestScore = score;
                        best = new PlacedBox(item.ItemId, ex, ey, ez, w, h, d, rotation, item.Weight, item.IsStackable, item.MaxStackCount, item.MaxWeightOnTop, item.UnloadingOrder);
                    }
                }
            }

            if (best is null)
            {
                unplaced.Add(new UnplacedBox(item.ItemId, UnplacedReason.InsufficientSpace));
                continue;
            }

            placements.Add(best);
            totalWeight += best.Weight;
            momentX += best.Weight * (best.X + best.W / 2m);
            momentZ += best.Weight * (best.Z + best.D / 2m);

            extremePoints.Add((best.X + best.W, best.Y, best.Z));
            extremePoints.Add((best.X, best.Y + best.H, best.Z));
            extremePoints.Add((best.X, best.Y, best.Z + best.D));

            extremePoints.RemoveWhere(p =>
                p.x >= input.VehicleWidth  ||
                p.y >= input.VehicleHeight ||
                p.z >= input.VehicleLength);
        }

        // ── İkinci geçiş: greedy swap ile denge iyileştirme ──────────────────
        // WeightBalance modunda, greedy faz sonrası kutu çiftleri takas edilerek
        // CoG sapması azaltılır. En fazla 3 tur çalışır, O(n²) her turda.
        if (input.Criteria == LoadingPlanOptimizationCriteria.WeightBalance && totalWeight > 0m)
            placements = ImproveBalance(placements, input.VehicleWidth, input.VehicleHeight,
                                        input.VehicleLength, totalWeight, halfW, halfL,
                                        cancellationToken);

        totalWeight = placements.Sum(p => p.Weight);

        var vehicleVolume = input.VehicleWidth * input.VehicleHeight * input.VehicleLength;
        var placedVolume  = placements.Sum(p => p.W * p.H * p.D);
        var fillRate      = vehicleVolume > 0 ? placedVolume / vehicleVolume : 0m;

        decimal? cogX = null, cogY = null, cogZ = null;
        decimal? balanceOffsetX = null, balanceOffsetZ = null;
        if (totalWeight > 0)
        {
            cogX = placements.Sum(p => p.Weight * (p.X + p.W / 2)) / totalWeight;
            cogY = placements.Sum(p => p.Weight * (p.Y + p.H / 2)) / totalWeight;
            cogZ = placements.Sum(p => p.Weight * (p.Z + p.D / 2)) / totalWeight;

            if (halfW > 0)
                balanceOffsetX = Math.Round(Math.Abs(cogX.Value - halfW) / halfW * 100, 1);
            if (halfL > 0)
                balanceOffsetZ = Math.Round(Math.Abs(cogZ.Value - halfL) / halfL * 100, 1);
        }

        var placedResults = placements
            .Select(p => new PlacedItemResult(Guid.NewGuid(), p.ItemId, p.X, p.Y, p.Z, p.W, p.H, p.D, p.Rotation, p.Weight))
            .ToList();

        var unplacedResults = unplaced
            .GroupBy(u => (u.ItemId, u.Reason))
            .Select(g => new UnplacedItemResult(g.Key.ItemId, g.Count(), g.Key.Reason))
            .ToList();

        return new OptimizationResult(placedResults, unplacedResults, totalWeight, fillRate, cogX, cogY, cogZ, balanceOffsetX, balanceOffsetZ);
    }

    // ── Grup zone hesaplama ───────────────────────────────────────────────────
    // Gruplara ait distinct UnloadingOrder değerlerini DESC sıralar ve kamyon
    // uzunluğunu eşit bölümlere ayırır. 0-1 grup varsa zone uygulanmaz.
    private static Dictionary<int, (decimal ZStart, decimal ZEnd)> ComputeGroupZones(
        IReadOnlyList<OptimizationItemInput> items,
        decimal vehicleLength,
        LoadingType loadingType,
        LoadingPlanOptimizationCriteria criteria)
    {
        // Zone ayrımı yalnızca LIFO modunda ve arka kapı yüklemesinde geçerli.
        if (criteria != LoadingPlanOptimizationCriteria.Lifo || loadingType != LoadingType.Rear)
            return [];

        var orders = items
            .Where(i => i.GroupId.HasValue && i.UnloadingOrder.HasValue)
            .Select(i => i.UnloadingOrder!.Value)
            .Distinct()
            .OrderByDescending(o => o)
            .ToList();

        if (orders.Count <= 1)
            return [];

        var zoneSize = vehicleLength / orders.Count;
        var zones = new Dictionary<int, (decimal ZStart, decimal ZEnd)>();

        for (int i = 0; i < orders.Count; i++)
            zones[orders[i]] = (i * zoneSize, (i + 1) * zoneSize);

        return zones;
    }

    // ── Grup-bilinçli sıralama ────────────────────────────────────────────────
    // GroupId'si olan items yükleme sırasına göre sıralanır:
    // yüksek UnloadingOrder = araç arkası = önce yüklenir (DESC sıra).
    // GroupId'si olmayan items en sona eklenir.
    // Grup yoksa mevcut criteria-based sıralama uygulanır.
    private static List<OptimizationItemInput> SortForGroupPlacement(
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

    private static IEnumerable<OptimizationItemInput> ApplyCriteriaSort(
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

    // ── İkinci geçiş: greedy swap balance iyileştirici ───────────────────────
    //
    // Her turda tüm kutu çiftleri taranır. İki kutu pozisyon değiştirdiğinde
    // denge cezası azalıyorsa ve takas geçerliyse (sınır + çakışma + destek)
    // takas kabul edilir. En fazla maxPasses tur çalışır.
    private static List<PlacedBox> ImproveBalance(
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

            if (BoxesOverlap(a, c) || BoxesOverlap(b, c)) return false;
        }

        // Destek kontrolü
        var others = placements.Where((_, k) => k != i && k != j).ToList();
        if (!HasSupportFor(a, others)) return false;
        if (!HasSupportFor(b, others)) return false;

        // Takas sonrası istif kısıtı kontrolü: i ve j kendileri hariç tutularak
        // kontrol edilir (others zaten bu listeyi oluşturmuş durumda).
        // İstiflenebilirlik de burada doğrulanır; aksi hâlde denge iyileştirmesi
        // bir kutuyu istiflenemez kutunun üstüne taşıyabiliyordu.
        if (ViolatesStackability(others, a.X, a.Y, a.Z, a.W, a.D)) return false;
        if (ViolatesStackability(others, b.X, b.Y, b.Z, b.W, b.D)) return false;
        if (ViolatesStackCount(others, a.X, a.Y, a.Z, a.W, a.D)) return false;
        if (ViolatesStackCount(others, b.X, b.Y, b.Z, b.W, b.D)) return false;
        if (ViolatesStackWeight(others, a.X, a.Y, a.Z, a.W, a.D, a.Weight)) return false;
        if (ViolatesStackWeight(others, b.X, b.Y, b.Z, b.W, b.D, b.Weight)) return false;

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
                if (!HasSupportFor(c, supportersOfC)) return false;
            }
        }

        return true;
    }

    private static bool BoxesOverlap(PlacedBox a, PlacedBox b) =>
        a.X < b.X + b.W && a.X + a.W > b.X &&
        a.Y < b.Y + b.H && a.Y + a.H > b.Y &&
        a.Z < b.Z + b.D && a.Z + a.D > b.Z;

    private static bool HasSupportFor(PlacedBox box, List<PlacedBox> others)
    {
        if (box.Y == 0m) return true;
        var footprint = box.W * box.D;
        if (footprint == 0m) return true;
        var supportedArea = 0m;
        foreach (var b in others)
        {
            if (b.Y + b.H != box.Y) continue;
            var ox = Math.Max(0m, Math.Min(box.X + box.W, b.X + b.W) - Math.Max(box.X, b.X));
            var oz = Math.Max(0m, Math.Min(box.Z + box.D, b.Z + b.D) - Math.Max(box.Z, b.Z));
            supportedArea += ox * oz;
        }
        return supportedArea / footprint >= 0.80m;
    }

    private static decimal GlobalBalancePenalty(
        List<PlacedBox> placements, decimal totalWeight,
        decimal halfW, decimal halfL)
    {
        if (totalWeight == 0m || halfW == 0m || halfL == 0m) return 0m;
        var cogX = placements.Sum(p => p.Weight * (p.X + p.W / 2m)) / totalWeight;
        var cogZ = placements.Sum(p => p.Weight * (p.Z + p.D / 2m)) / totalWeight;
        return Math.Abs(cogX - halfW) / halfW + Math.Abs(cogZ - halfL) / halfL;
    }

    // ── Maliyet fonksiyonu ────────────────────────────────────────────────────
    private static decimal ComputeScore(
        LoadingPlanOptimizationCriteria criteria,
        decimal ex, decimal ey, decimal ez,
        decimal w,  decimal d,
        decimal itemWeight, decimal totalWeight,
        decimal momentX, decimal momentZ,
        decimal halfW, decimal halfL,
        decimal? zoneStart, decimal? zoneEnd)
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

        var balancePenalty = normDevX + normDevZ;

        var zonePenalty = 0m;
        if (zoneStart.HasValue && zoneEnd.HasValue)
        {
            var overLeft  = Math.Max(0m, zoneStart.Value - ez);
            var overRight = Math.Max(0m, (ez + d) - zoneEnd.Value);
            zonePenalty = (overLeft + overRight) * 2_000m;
        }

        return criteria switch
        {
            LoadingPlanOptimizationCriteria.VolumeFirst =>
                ey * 1_000_000m + ez * 1_000m + balancePenalty * 500m + ex + zonePenalty,

            // Sadece yerçekimi ve denge — Z/X tercihi yok
            LoadingPlanOptimizationCriteria.WeightBalance =>
                ey * 1_000_000m + balancePenalty * 900_000m + zonePenalty,

            _ => // Lifo
                ey * 1_000_000m + ez * 1_000m + ex + zonePenalty,
        };
    }

    private static (decimal w, decimal h, decimal d, LoadingPlanPlacementRotation rotation)[]
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

    private static bool HasOverlap(
        List<PlacedBox> placed,
        decimal x, decimal y, decimal z,
        decimal w, decimal h, decimal d)
    {
        foreach (var b in placed)
        {
            if (x < b.X + b.W && x + w > b.X &&
                y < b.Y + b.H && y + h > b.Y &&
                z < b.Z + b.D && z + d > b.Z)
                return true;
        }
        return false;
    }

    private static bool HasSupport(
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

    private static bool ViolatesStackability(
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

            // LIFO stack kuralı: daha geç inen ürün, daha erken inenin üstüne konamaz
            if (newItemUnloadingOrder.HasValue && b.UnloadingOrder.HasValue
                && newItemUnloadingOrder.Value > b.UnloadingOrder.Value)
                return true;
        }
        return false;
    }

    // Yerleştirilecek ürünün altındaki her kutu için: o kutunun üzerinde halihazırda
    // kaç ürün var, +1 (yeni ürün) MaxStackCount'u aşıyor mu?
    private static bool ViolatesStackCount(
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
    private static bool ViolatesStackWeight(
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

    private sealed record PlacedBox(
        Guid ItemId,
        decimal X, decimal Y, decimal Z,
        decimal W, decimal H, decimal D,
        LoadingPlanPlacementRotation Rotation,
        decimal Weight,
        bool IsStackable,
        int MaxStackCount,
        decimal MaxWeightOnTop,
        int? UnloadingOrder);

    private sealed record UnplacedBox(Guid ItemId, UnplacedReason Reason);
}
