using CargoPilot.Application.Common.Models;
using CargoPilot.Domain.Enums;

namespace CargoPilot.Application.Common.Optimization.WallBuilder;

/// <summary>
/// Duvar tabanli yerlestirici (George &amp; Robinson 1980).
///
/// Arac derinlik boyunca ardisik dikey duvarlarla doldurulur. Duvarin derinligi
/// o duvara giren ILK kutunun z olcusudur; sonraki kutular once ayni duvarin
/// icine sigmaya calisir, sigmazsa yeni duvar acilir. Cikti sahadaki yukleme
/// pratigine uyar: isci de duvar duvar orer.
///
/// Greedy motorla farki iki yerdedir:
/// (1) Aday noktalar yerlestirilmis kutulara komsu dogmaz; bos hacmin kendisi
///     <see cref="SpaceLedger"/> ile tasinir, boylece iki kutu arasinda kalan
///     yarik aday olmaya devam eder.
/// (2) Duvar disiplini bir skor terimi degil, taramanin kapsamidir.
///
/// Sert kisitlar KOPYALANMAZ: yedi kapinin tamami <see cref="PlacementValidator"/>
/// uzerinden sorulur (ALGORITMA-RULEBOOK.md R-C01/R-C12).
/// </summary>
internal static class WallBuilderPlacement
{
    /// <summary>
    /// Varsayilan sirayla kosar. Siralama greedy ile ortaktir (hacim-azalan): iki
    /// alternatif olculdu ve ikisi de kotulesti — derinlik kovasi %74,12, LAFF
    /// %72,32 (bkz. ALGORITMA-GELISTIRME-LOG.md).
    /// </summary>
    internal static OptimizationResult Run(OptimizationInput input, CancellationToken cancellationToken)
    {
        var expanded = input.Items.SelectMany(i => Enumerable.Range(0, i.Quantity).Select(_ => i));

        return Run(
            input,
            [.. ItemOrdering.SortForGroupPlacement(expanded, input.Criteria, input.ClusterGroups)
                .Select(SequencedItem.Plain)],
            cancellationToken);
    }

    /// <summary>
    /// Disaridan verilen sirayla kosar. Arama katmani (R-C05) yerlestiriciyi tam
    /// olarak boyle cagirir: sira arama katmanina, yerlestirme buraya aittir ve
    /// ikisi birbirinin icine gecmez.
    /// </summary>
    internal static OptimizationResult Run(
        OptimizationInput input,
        IReadOnlyList<SequencedItem> instances,
        CancellationToken cancellationToken)
    {
        var modules = OptimizationModules.Resolve(input);

        var placements = new List<PlacedBox>();
        var unplaced = new List<UnplacedBox>();
        var totalWeight = 0m;

        var fillFromMaxX = input.FillsFromMaxX;
        var ledger = new SpaceLedger(input.VehicleWidth, input.VehicleHeight, input.VehicleLength, fillFromMaxX);
        var groupZones = LifoPlacement.ComputeGroupZones(
            [.. instances.Select(i => i.Item)], input.VehicleLength, modules.UseLifo);

        // Kalan kutularin en kucuk kenari: bundan dar bosluk hicbir kutuyu alamaz.
        // Tek seferde hesaplanir; kutular yerlestikce kucumsemek daha cok bosluk
        // tutar ama asla yanlis eleme yapmaz.
        var minSide = instances.Count == 0
            ? 0m
            : instances.Min(i => Math.Min(i.Item.Width, Math.Min(i.Item.Height, i.Item.Length)));

        // Duvarlar acilis sirasinda tutulur. Yalnizca ACIK duvara bakmak buyuk bir
        // doluluk kaybiydi: bir duvar kapandiginda icinde kalan bosluklar
        // taramanin disinda kaliyor ve bir daha hic kullanilamiyordu. Duvar
        // insaati zaten "once mevcut duvarin bosluklarini doldur, sonra yenisini
        // ac" demek (R-C09).
        var walls = new List<Wall>();

        // Basarisiz denemenin bedeli agirdir: aday bulunamadiginda erken cikis
        // tetiklenmez ve defterin tamami taranir. Ayni urunden 88 adet ust uste
        // sigmadiginda bu tarama 88 kez tekrarlaniyordu.
        //
        // Ayni urun kimligi ayni olculeri ve ayni kisitlari tasir; yerlestirme
        // durumu degismediyse sonuc da degismek zorunda. Bu yuzden basarisizlik
        // hatirlanir ve ilk basarili yerlestirmede unutulur — bellege alma saf,
        // ciktiyi degistirmez.
        var failedSincePlacement = new Dictionary<Guid, UnplacedReason>();

        foreach (var sequenced in instances)
        {
            var item = sequenced.Item;
            cancellationToken.ThrowIfCancellationRequested();

            if (totalWeight + item.Weight > input.VehicleMaxWeight)
            {
                unplaced.Add(new UnplacedBox(item.ItemId, UnplacedReason.WeightLimitExceeded));
                continue;
            }

            if (failedSincePlacement.TryGetValue(item.ItemId, out var cachedReason))
            {
                unplaced.Add(new UnplacedBox(item.ItemId, cachedReason));
                continue;
            }

            decimal? zoneStart = null;
            decimal? zoneEnd = null;
            if (groupZones.TryGetValue(item.UnloadingOrder ?? -1, out var zone))
            {
                zoneStart = zone.ZStart;
                zoneEnd = zone.ZEnd;
            }

            // Once var olan duvarlar, acilis sirasiyla: kapiya en uzak duvarin
            // artigi once dolar, boylece plan onden arkaya sikilasir.
            PlacedBox? best = null;
            var blockedByFragility = false;

            // Kutunun en kucuk kenari duvar derinliginden buyukse o duvar hicbir
            // yonelimde alamaz. On-eleme olmadan her duvar icin tum defter
            // taraniyordu: 500 kutuluk senaryoda maliyetin buyuk kismi buydu.
            var itemMinSide = Math.Min(item.Width, Math.Min(item.Height, item.Length));

            foreach (var wall in walls)
            {
                if (wall.End - wall.Start < itemMinSide) continue;

                var attempt = TryPlace(input, ledger, placements, sequenced, fillFromMaxX,
                    wall.Start, wall.End, zoneStart, zoneEnd);

                blockedByFragility |= attempt.BlockedByFragility;
                if (attempt.Box is null) continue;

                best = attempt.Box;
                break;
            }

            // Hicbir duvara sigmadiysa yeni duvar acilir. Derinligi ilk kutunun
            // z olcusu tanimlar (G&R kurali, R-C08).
            if (best is null)
            {
                var frontier = walls.Count > 0 ? walls[^1].End : 0m;
                var opened = TryPlace(input, ledger, placements, sequenced, fillFromMaxX,
                    frontier, null, zoneStart, zoneEnd);

                blockedByFragility |= opened.BlockedByFragility;

                if (opened.Box is not null)
                {
                    best = opened.Box;
                    walls.Add(new Wall(best.Z, best.Z + best.Length));
                }
            }

            if (best is null)
            {
                var reason = blockedByFragility
                    ? UnplacedReason.FragilityOrHandlingConstraint
                    : UnplacedReason.InsufficientSpace;

                unplaced.Add(new UnplacedBox(item.ItemId, reason));
                failedSincePlacement[item.ItemId] = reason;
                continue;
            }

            placements.Add(best);
            totalWeight += best.Weight;
            ledger.Place(best.X, best.Y, best.Z, best.Width, best.Height, best.Length, minSide);

            // Yerlesim durumu degisti: onceki basarisizliklar artik gecerli degil.
            failedSincePlacement.Clear();
        }

        return PlanResultBuilder.Build(
            placements, unplaced, input.VehicleWidth, input.VehicleHeight, input.VehicleLength);
    }

    private readonly record struct Attempt(PlacedBox? Box, bool BlockedByFragility);

    /// <summary>
    /// Bir z bandi. Derinligini o banda giren ilk kutu belirler (G&amp;R kurali).
    ///
    /// Duvar icinde y ekseninde SERIT bandi denendi ve doluluk %75,08 → %50,49'a
    /// coktu: seridin yuksekligini ilk kutu belirleyince o duvara giren tum
    /// kutular o yukseklige mahkum kaliyor ve cogu disarida kaliyor. Bant
    /// disiplini z ekseninde ise yariyor, y ekseninde bogyor.
    /// </summary>
    private sealed record Wall(decimal Start, decimal End);

    /// <summary>
    /// Aday karsilastirma anahtari (bosluk x yonelim). Kucuk olan kazanir;
    /// <c>Rotation</c> son eslik bozucudur ve determinizmi garanti eder.
    /// </summary>
    private readonly record struct OrientationFit(
        decimal Y,
        decimal Residual,
        decimal DepthWaste,
        decimal NegativeBaseArea,
        LoadingPlanPlacementRotation Rotation)
    {
        public bool IsBetterThan(OrientationFit other)
        {
            var byY = Y.CompareTo(other.Y);
            if (byY != 0) return byY < 0;

            var byResidual = Residual.CompareTo(other.Residual);
            if (byResidual != 0) return byResidual < 0;

            var byDepth = DepthWaste.CompareTo(other.DepthWaste);
            if (byDepth != 0) return byDepth < 0;

            var byBase = NegativeBaseArea.CompareTo(other.NegativeBaseArea);

            return byBase != 0 ? byBase < 0 : Rotation < other.Rotation;
        }
    }

    /// <summary>
    /// Verilen z bandinda en iyi adayi arar. <paramref name="zLimit"/> null ise
    /// band ucu aciktir — yeni duvarin ilk kutusu icin.
    /// </summary>
    private static Attempt TryPlace(
        OptimizationInput input,
        SpaceLedger ledger,
        List<PlacedBox> placements,
        SequencedItem sequenced,
        bool fillFromMaxX,
        decimal zFloor,
        decimal? zLimit,
        decimal? zoneStart,
        decimal? zoneEnd)
    {
        var item = sequenced.Item;
        var orientations = PlacementValidator.GetOrientations(item);

        // Yonelim tercihi ARAMAYA acilmayi denedi ve kazandirmadi: 300 senaryoda
        // ortalama %76,77 → %76,65, medyan %76,48 → %76,04 (yalniz alt kuyruk
        // hafif iyilesti). Vektorun ikinci yarisi bu yuzden bugun uretilmiyor ve
        // <c>OrientationKey</c> daima "tercih yok" degeri tasiyor; tarama tum
        // yonelimleri gorup en sıkı oturani seciyor.
        // Baglanti kodu duruyor cunku deneyi tekrarlamanin bedeli tek satir.
        var start = sequenced.OrientationKey >= 0d
            ? Math.Clamp((int)(sequenced.OrientationKey * orientations.Length), 0, orientations.Length - 1)
            : 0;

        PlacedBox? best = null;
        PlacedBox? bestInZone = null;
        OrientationFit? bestFit = null;
        OrientationFit? bestZoneFit = null;
        var blockedByFragility = false;

        foreach (var space in ledger.Spaces)
        {
            if (space.MaxZ <= zFloor) continue;

            for (var offset = 0; offset < orientations.Length; offset++)
            {
                var (width, height, length, rotation) = orientations[(start + offset) % orientations.Length];

                if (!space.Fits(width, height, length)) continue;

                // Aynalanmis modda bosluğun sag kenarindan geriye hesaplanir; aksi
                // halde ayni plan aynalandiginda kutu duvardan tasardi.
                var x = fillFromMaxX ? space.MaxX - width : space.X;
                var y = space.Y;
                var z = space.Z < zFloor ? zFloor : space.Z;

                if (z + length > space.MaxZ) continue;
                if (zLimit.HasValue && z + length > zLimit.Value) continue;

                if (x < 0m || x + width > input.VehicleWidth) continue;
                if (y + height > input.VehicleHeight) continue;
                if (z + length > input.VehicleLength) continue;

                if (PlacementValidator.HasOverlap(placements, x, y, z, width, height, length)) continue;
                if (!PlacementValidator.HasSupport(placements, x, y, z, width, length)) continue;
                if (PlacementValidator.ViolatesStackability(placements, x, y, z, width, length,
                    input.Criteria == LoadingPlanOptimizationCriteria.Lifo ? item.UnloadingOrder : null)) continue;
                if (PlacementValidator.ViolatesStackCount(placements, x, y, z, width, length)) continue;
                if (PlacementValidator.ViolatesStackWeight(placements, x, y, z, width, length, item.Weight)) continue;
                if (PlacementValidator.ViolatesFragility(placements, x, y, z, width, length))
                {
                    blockedByFragility = true;
                    continue;
                }

                // Bosluklar arasinda en sıkı oturan kazanir (best-fit): once alcak
                // katman — yercekimi tercihi korunur — sonra bosluktan artan hacim.
                // Sira sozlukbilimseldir, agirlikli toplam degil: toplam olsaydi
                // katsayilarin kalibrasyonu yeni bir borc olurdu.
                var residual = space.Width * space.Height * space.Length - width * height * length;
                var candidate = new OrientationFit(
                    y, residual, space.MaxZ - (z + length), -(width * length), rotation);

                if (bestFit is null || candidate.IsBetterThan(bestFit.Value))
                {
                    bestFit = candidate;
                    best = Create(item, x, y, z, width, height, length, rotation);
                }

                if (LifoPlacement.IsInsideZone(zoneStart, zoneEnd, z, length)
                    && (bestZoneFit is null || candidate.IsBetterThan(bestZoneFit.Value)))
                {
                    bestZoneFit = candidate;
                    bestInZone = Create(item, x, y, z, width, height, length, rotation);
                }

            }
        }

        // Bolge kisiti burada sertlesir: bolge ici aday varsa o kazanir, yoksa
        // kutu yalnizca bolgesi dar kaldi diye dusmez (greedy ile ayni kademe).
        return new Attempt(bestInZone ?? best, blockedByFragility);
    }

    private static PlacedBox Create(
        OptimizationItemInput item,
        decimal x, decimal y, decimal z,
        decimal width, decimal height, decimal length,
        LoadingPlanPlacementRotation rotation)
        => new(item.ItemId, x, y, z, width, height, length, rotation, item.Weight,
            item.IsStackable, item.MaxStackCount, item.MaxWeightOnTop, item.FragilityType, item.UnloadingOrder);

}
