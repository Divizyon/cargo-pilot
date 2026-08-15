using CargoPilot.Application.Common.Interfaces;
using CargoPilot.Application.Common.Models;
using CargoPilot.Domain.Enums;

namespace CargoPilot.Application.Common.Optimization;

internal sealed class OptimizationEngine : IOptimizationEngine
{
    // Kalibre edilmiş yerçekimi katsayısı: yükseklik farkı diğer tüm
    // terimleri bastırır, yani motor önce alçak noktaları doldurur.
    private const decimal GravityCoefficient = 1_000_000m;

    public OptimizationResult Run(OptimizationInput input, CancellationToken cancellationToken = default)
    {
        // Modül bayrakları sıcak döngüden önce bir kez çözülür ve yerel
        // değişkenlere okunur, böylece aday taramasında kayıt alanı okunmaz.
        var modules = OptimizationModules.Resolve(input);
        var useVolume = modules.UseVolume;
        var useWeightBalance = modules.UseWeightBalance;

        var placements = new List<PlacedBox>();
        var unplaced = new List<UnplacedBox>();
        var totalWeight = 0m;

        var momentX = 0m;
        var momentZ = 0m;

        var expanded = input.Items
            .SelectMany(i => Enumerable.Range(0, i.Quantity).Select(_ => i));

        var instances = ItemOrdering.SortForGroupPlacement(expanded, input.Criteria, input.ClusterGroups);

        var halfW = input.VehicleWidth  / 2m;
        var halfL = input.VehicleLength / 2m;

        // ── Extreme-point tohumu ──────────────────────────────────────────────
        // WeightBalance: aracın 4 kat-zemin köşesi tohumlanır; aksi hâlde greedy
        // her zaman (0,0,0) yakınına yığılır ve ön-arka/sol-sağ denge bozulur.
        var extremePoints = new HashSet<(decimal x, decimal y, decimal z)> { (0m, 0m, 0m) };
        if (useWeightBalance
            && input.Criteria == LoadingPlanOptimizationCriteria.WeightBalance
            && halfW > 0m && halfL > 0m)
        {
            extremePoints.Add((halfW, 0m, 0m));    // arka-sağ
            extremePoints.Add((0m,    0m, halfL)); // ön-sol
            extremePoints.Add((halfW, 0m, halfL)); // ön-sağ
        }

        var groupZones = LifoPlacement.ComputeGroupZones(instances, input.VehicleLength, input.LoadingType, modules.UseLifo);

        // LIFO bölgeleri de aynı nedenle tohumlanır: aday noktalar yalnızca
        // yerleştirilmiş kutulara komşu doğduğu için her grup Z=0'a, yani uzak
        // yüze yığılıyordu. Her bölgenin başlangıcı aday yapılınca grup kendi
        // bölgesinden başlayarak dolar.
        foreach (var zoneStart in groupZones.Values.Select(z => z.ZStart).Where(z => z > 0m))
            extremePoints.Add((0m, 0m, zoneStart));

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

            // ── İki kademeli aday seçimi ──────────────────────────────────────
            // LIFO grup bölgesi sert kısıttır: bölge içinde geçerli en az bir
            // aday varsa seçim yalnızca onlar arasından yapılır. Bölge içi hiç
            // aday yoksa (bölge kutudan dar kalabilir) bugünkü cezalı skorlamaya
            // düşülür, böylece kutu yalnızca bölgesi yüzünden düşmez.
            PlacedBox? bestInZone = null;
            var bestInZoneScore = decimal.MaxValue;

            // Aday yalnızca kırılganlık yüzünden elendiyse ret sebebi "yer yok"
            // değil, kırılganlık kısıtı olarak raporlanır. Bayrak ancak diğer tüm
            // sert kısıtları geçmiş bir aday elendiğinde kalkar
            var blockedByFragility = false;

            foreach (var (ex, ey, ez) in extremePoints.OrderBy(p => p.y).ThenBy(p => p.z).ThenBy(p => p.x))
            {
                foreach (var (width, height, length, rotation) in PlacementValidator.GetOrientations(item))
                {
                    if (ex + width > input.VehicleWidth)  continue;
                    if (ey + height > input.VehicleHeight) continue;
                    if (ez + length > input.VehicleLength) continue;

                    if (PlacementValidator.HasOverlap(placements, ex, ey, ez, width, height, length)) continue;
                    if (!PlacementValidator.HasSupport(placements, ex, ey, ez, width, length))   continue;
                    if (PlacementValidator.ViolatesStackability(placements, ex, ey, ez, width, length,
                        input.Criteria == LoadingPlanOptimizationCriteria.Lifo ? item.UnloadingOrder : null)) continue;
                    if (PlacementValidator.ViolatesStackCount(placements, ex, ey, ez, width, length)) continue;
                    if (PlacementValidator.ViolatesStackWeight(placements, ex, ey, ez, width, length, item.Weight)) continue;
                    if (PlacementValidator.ViolatesFragility(placements, ex, ey, ez, width, length))
                    {
                        blockedByFragility = true;
                        continue;
                    }

                    var score = ComputeScore(
                        input.Criteria,
                        useVolume, useWeightBalance,
                        ex, ey, ez, width, length,
                        item.Weight, totalWeight,
                        momentX, momentZ,
                        halfW, halfL,
                        zoneStart, zoneEnd);

                    if (score < bestScore)
                    {
                        bestScore = score;
                        best = new PlacedBox(item.ItemId, ex, ey, ez, width, height, length, rotation, item.Weight, item.IsStackable, item.MaxStackCount, item.MaxWeightOnTop, item.FragilityType, item.UnloadingOrder);
                    }

                    // Katı "<" karşılaştırması burada da korunur: eşit skorlu
                    // adaylarda ilk gelen kazanır, determinizm bozulmaz.
                    if (LifoPlacement.IsInsideZone(zoneStart, zoneEnd, ez, length) && score < bestInZoneScore)
                    {
                        bestInZoneScore = score;
                        bestInZone = new PlacedBox(item.ItemId, ex, ey, ez, width, height, length, rotation, item.Weight, item.IsStackable, item.MaxStackCount, item.MaxWeightOnTop, item.FragilityType, item.UnloadingOrder);
                    }
                }
            }

            // Bölge kısıtı burada "sert" olur: bölge içi aday varsa o kazanır.
            best = bestInZone ?? best;

            if (best is null)
            {
                unplaced.Add(new UnplacedBox(
                    item.ItemId,
                    blockedByFragility
                        ? UnplacedReason.FragilityOrHandlingConstraint
                        : UnplacedReason.InsufficientSpace));
                continue;
            }

            placements.Add(best);
            totalWeight += best.Weight;
            momentX += best.Weight * (best.X + best.Width / 2m);
            momentZ += best.Weight * (best.Z + best.Length / 2m);

            extremePoints.Add((best.X + best.Width, best.Y, best.Z));
            extremePoints.Add((best.X, best.Y + best.Height, best.Z));
            extremePoints.Add((best.X, best.Y, best.Z + best.Length));

            extremePoints.RemoveWhere(p =>
                p.x >= input.VehicleWidth  ||
                p.y >= input.VehicleHeight ||
                p.z >= input.VehicleLength);
        }

        // ── İkinci geçiş: greedy swap ile denge iyileştirme ──────────────────
        // WeightBalance modunda, greedy faz sonrası kutu çiftleri takas edilerek
        // CoG sapması azaltılır. En fazla 3 tur çalışır, O(n²) her turda.
        // Modül kapalıyken ikinci geçiş hiç çalışmaz.
        if (useWeightBalance
            && input.Criteria == LoadingPlanOptimizationCriteria.WeightBalance
            && totalWeight > 0m)
            placements = BalanceScoring.ImproveBalance(placements, input.VehicleWidth, input.VehicleHeight,
                                                       input.VehicleLength, totalWeight, halfW, halfL,
                                                       cancellationToken);

        totalWeight = placements.Sum(p => p.Weight);

        var vehicleVolume = input.VehicleWidth * input.VehicleHeight * input.VehicleLength;
        var placedVolume  = placements.Sum(p => p.Width * p.Height * p.Length);
        var fillRate      = vehicleVolume > 0 ? placedVolume / vehicleVolume : 0m;

        decimal? cogX = null, cogY = null, cogZ = null;
        decimal? balanceOffsetX = null, balanceOffsetZ = null;
        if (totalWeight > 0)
        {
            cogX = placements.Sum(p => p.Weight * (p.X + p.Width / 2)) / totalWeight;
            cogY = placements.Sum(p => p.Weight * (p.Y + p.Height / 2)) / totalWeight;
            cogZ = placements.Sum(p => p.Weight * (p.Z + p.Length / 2)) / totalWeight;

            if (halfW > 0)
                balanceOffsetX = Math.Round(Math.Abs(cogX.Value - halfW) / halfW * 100, 1);
            if (halfL > 0)
                balanceOffsetZ = Math.Round(Math.Abs(cogZ.Value - halfL) / halfL * 100, 1);
        }

        var placedResults = placements
            .Select(p => new PlacedItemResult(Guid.NewGuid(), p.ItemId, p.X, p.Y, p.Z, p.Width, p.Height, p.Length, p.Rotation, p.Weight))
            .ToList();

        var unplacedResults = unplaced
            .GroupBy(u => (u.ItemId, u.Reason))
            .Select(g => new UnplacedItemResult(g.Key.ItemId, g.Count(), g.Key.Reason))
            .ToList();

        return new OptimizationResult(placedResults, unplacedResults, totalWeight, fillRate, cogX, cogY, cogZ, balanceOffsetX, balanceOffsetZ);
    }

    // ── Maliyet fonksiyonu ────────────────────────────────────────────────────
    //
    // Skor artık kriter başına ayrı bir ifade değil, modül terimlerinin
    // toplamıdır. İlgisiz modülün terimi tam olarak 0m'dir.
    //
    // TOPLAMA SIRASI KRİTİKTİR: decimal toplamada sıra değişirse yuvarlama
    // farkı en-iyi-aday seçimini kaydırabilir. Tek bir sabit sıra kullanılır —
    // yerçekimi → derinlik → denge → genişlik → bölge — ve bu sıra her kriterin
    // bugünkü ifadesindeki sıfır olmayan terimlerin göreli sırasıyla birebir
    // aynıdır:
    //   VolumeFirst  : ey*1e6 + ez*1e3 + denge*500     + ex + bölge
    //   WeightBalance: ey*1e6 +          denge*900_000      + bölge
    //   Lifo         : ey*1e6 + ez*1e3 +                ex + bölge
    // Kapalı modülün terimi ölçeği 0 olan 0m sabitidir; decimal toplamada
    // değeri de ölçeği de değiştirmez.
    //
    // BÖLGE TERİMİ ARTIK DİĞERLERİNİN AKRANI DEĞİLDİR. Aday seçimi iki
    // kademelidir (bkz. Run içindeki bestInZone): bölge içi geçerli bir aday
    // varsa seçim yalnızca onlar arasından yapılır ve bu skorun bölge terimi
    // zaten 0'dır. Yukarıdaki üç satırdaki "+ bölge" ifadeleri bu yüzden
    // yalnızca YEDEK kademede — yani hiçbir aday bölgesine sığmadığında —
    // etkilidir; orada da adayları birbirine göre sıralamaktan başka bir işi
    // yoktur. Katsayının yerçekimi katsayısından küçük olması bu nedenle
    // bölge disiplinini zayıflatmaz.
    //
    // Hangi terimin açık olduğunu artık kriter değil modül bayrakları belirler.
    // Bayraklar verilmediğinde kriterden türetildikleri için yukarıdaki üç satır
    // varsayılan davranış olarak geçerliliğini korur.
    private static decimal ComputeScore(
        LoadingPlanOptimizationCriteria criteria,
        bool useVolume, bool useWeightBalance,
        decimal ex, decimal ey, decimal ez,
        decimal width,  decimal length,
        decimal itemWeight, decimal totalWeight,
        decimal momentX, decimal momentZ,
        decimal halfW, decimal halfL,
        decimal? zoneStart, decimal? zoneEnd)
    {
        // Yerçekimi terimi her kriterde ortaktır ve kapatılamaz: alçak nokta
        // her zaman baskın tercihtir.
        var gravityTerm = ey * GravityCoefficient;

        var lengthTerm = VolumeScoring.LengthTerm(useVolume, ez);

        var balanceTerm = BalanceScoring.Term(
            useWeightBalance,
            criteria,
            ex, ez, width, length,
            itemWeight, totalWeight,
            momentX, momentZ,
            halfW, halfL);

        var widthTerm = VolumeScoring.WidthTerm(useVolume, ex);

        var zoneTerm = LifoPlacement.ZonePenalty(zoneStart, zoneEnd, ez, length);

        return gravityTerm + lengthTerm + balanceTerm + widthTerm + zoneTerm;
    }
}
