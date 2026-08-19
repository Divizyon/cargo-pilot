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
/// uzerinden sorulur (docs/algorithm/01-kurallar.md R-C01/R-C12).
/// </summary>
internal static class WallBuilderPlacement
{
    /// <summary>Bilesik blokta ust katin taban kati kapatma orani.</summary>
    private const decimal FootprintMatch = 0.85m;

    /// <summary>
    /// Varsayilan sirayla kosar. Siralama greedy ile ortaktir (hacim-azalan): iki
    /// alternatif olculdu ve ikisi de kotulesti — derinlik kovasi %74,12, LAFF
    /// %72,32 (bkz. docs/algorithm/04-olcum-gunlugu.md).
    /// </summary>
    internal static OptimizationResult Run(OptimizationInput input, CancellationToken cancellationToken)
    {
        var expanded = input.Items.SelectMany(i => Enumerable.Range(0, i.Quantity).Select(_ => i));

        return Run(
            input,
            [.. ItemOrdering.SortForGroupPlacement(expanded, input.Criteria, input.ClusterGroups)
                .Select(SequencedItem.Plain)],
            DecoderKeys.Neutral,
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
        DecoderKeys decoder,
        CancellationToken cancellationToken)
        => Run(input, instances, decoder, start: null, cancellationToken).Result;

    /// <summary>
    /// Verilen durumdan DEVAM EDER ve bitis durumunu da dondurur.
    ///
    /// Ileri bakisli arama (F7-4) icin gerekli: bir dal yarim kalmis bir
    /// durumdan sonuna kadar goturulur, sonucu olculur, sonra baska bir dal
    /// AYNI yarim durumdan yeniden baslar.
    ///
    /// <paramref name="start"/> <c>null</c> ise bos aractan baslar — bu, ayrim
    /// yapilmadan onceki davranisin birebir aynisidir. Dongu zaten tuketilmis
    /// birimleri atladigi icin yarim bir durumdan devam etmek ek bir kural
    /// gerektirmez.
    /// </summary>
    internal static (OptimizationResult Result, PlacementState State) Run(
        OptimizationInput input,
        IReadOnlyList<SequencedItem> instances,
        DecoderKeys decoder,
        PlacementState? start,
        CancellationToken cancellationToken,
        int stopAfterPlacements = int.MaxValue)
    {
        var modules = OptimizationModules.Resolve(input);

        var fillFromMaxX = input.FillsFromMaxX;
        var lifo = modules.UseLifo && instances.Any(i => i.Item.UnloadingOrder.HasValue);
        var state = start ?? PlacementState.Fresh(input, instances.Count, DepthBudget(input, instances, lifo));

        var placements = state.Placements;
        var unplaced = state.Unplaced;
        var ledger = state.Ledger;
        var totalWeight = state.TotalWeight;
        // LIFO'nun uzaysal kurali artik BANT degil CIKARILABILIRLIKTIR
        // (PlacementValidator.ViolatesUnloadPath). Gruplar uzayda ic ice
        // gecebilir; onemli olan bir grup inerken hala aracta olan hicbir
        // kutunun oynamak zorunda kalmamasidir.
        //
        // Bant modeli olculdu ve iki yonden de kotuydu: dar bant kutulari
        // zorunlu tasitiyor, genis bant hic baglamiyordu. Sozluk bos birakilinca
        // yerlestirici LIFO disi yolla ayni davranir ve kural tek yerden,
        // sert kapi olarak uygulanir.
        var groupZones = new Dictionary<int, (decimal ZStart, decimal ZEnd)>();

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
        var walls = state.Walls;

        // Hedef derinlik: yuk aracin onune toplansin diye yerlestirmenin
        // gecemeyecegi z tavani. Ideal derinlik %100 dolulugu varsayar, bu
        // yuzden gercekci bir pay ile carpilir (DepthSlack).
        //
        // Bu bir SERT sinir degil, bir TERCIHTIR: bir kutu hedefe sigmazsa
        // hedef adim adim buyutulur ve kutu yeniden denenir. Doluluk asla
        // dusmez; degisen sey yerin nasil kullanildigidir.
        var depthBudget = state.DepthBudget;

        // Basarisiz denemenin bedeli agirdir: aday bulunamadiginda erken cikis
        // tetiklenmez ve defterin tamami taranir. Ayni urunden 88 adet ust uste
        // sigmadiginda bu tarama 88 kez tekrarlaniyordu.
        //
        // Ayni urun kimligi ayni olculeri ve ayni kisitlari tasir; yerlestirme
        // durumu degismediyse sonuc da degismek zorunda. Bu yuzden basarisizlik
        // hatirlanir ve ilk basarili yerlestirmede unutulur — bellege alma saf,
        // ciktiyi degistirmez.
        var failedSincePlacement = state.FailedSincePlacement;

        // Kule insasi sirayi ONDEN tuketir: bir kutu yerlestiginde ayni urunun
        // sonraki birimleri dogrudan ustune yigilir. Bu yuzden dongu artik
        // foreach degil; tuketilen birimler atlanir.
        var consumed = state.Consumed;

        for (var index = 0; index < instances.Count; index++)
        {
            if (consumed[index]) continue;

            // Ileri bakisli arama durumu PARCA PARCA ilerletir: belirli sayida
            // yerlestirmeden sonra durur, dali degerlendirir, sonra devam eder.
            if (placements.Count >= stopAfterPlacements)
            {
                // Yarim kalan kosuda "yerlesemedi" kayitlari GECICIDIR: devam
                // eden kosu ayni kutulari bastan degerlendirecek ve durum
                // degistigi icin bir kismi artik yerlesebilecek. Temizlenmezse
                // ayni kutu iki kez "yerlesemedi" sayilir ve adet korunumu
                // bozulur — DR-49'da bir kez yasandi.
                unplaced.Clear();
                failedSincePlacement.Clear();
                break;
            }

            var sequenced = instances[index];
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

            // Blok, taban kutunun girdigi duvar bandini asamaz. Yeni acilan
            // duvarda band derinligi zaten ilk kutunun z olcusudur, yani blok
            // orada tek sira kalir; son care taramasinda band yoktur.
            decimal? blockZLimit = null;

            // Kutunun en kucuk kenari duvar derinliginden buyukse o duvar hicbir
            // yonelimde alamaz. On-eleme olmadan her duvar icin tum defter
            // taraniyordu: 500 kutuluk senaryoda maliyetin buyuk kismi buydu.
            var itemMinSide = Math.Min(item.Width, Math.Min(item.Height, item.Length));

            // Aday secimi tek kutuya degil BLOGA bakar: bu urunden kac birim
            // kaldigini bilmeden "bu bosluk bir blok alir mi" sorusu sorulamaz.
            var remaining = RemainingUnits(instances, consumed, index, item.ItemId);

            // Duvarlar acilis sirasiyla taranir ve ILK aday veren duvarda durulur
            // — ama yalnizca o aday BOLGE ICINDEYSE. Bolge disi bir adayda durmak
            // LIFO sozunu deliyordu: bir sonraki duvarda bolge ici aday olsa bile
            // gorulmuyordu. Olculdu, uc LIFO testi bu yuzden kirildi
            // (docs/algorithm/02-kararlar.md DR-40).
            //
            // Bolge disi aday yine de saklanir: hicbir duvarda bolge ici yer
            // yoksa kutu bolgesi yuzunden disarida birakilmaz.
            var bestInZone = false;

            foreach (var wall in walls)
            {
                if (wall.End - wall.Start < itemMinSide) continue;

                var attempt = TryPlace(input, ledger, placements, sequenced, fillFromMaxX,
                    wall.Start, wall.End, zoneStart, zoneEnd, remaining, 0m);

                blockedByFragility |= attempt.BlockedByFragility;
                if (attempt.Box is null) continue;

                if (best is not null && !attempt.InZone) continue;

                best = attempt.Box;
                blockZLimit = wall.End;
                bestInZone = attempt.InZone;

                if (bestInZone) break;
            }

            // Iki yedek kademe ve SIRALARI. Sabit hicbir sira kazanmiyor: cebi
            // once denemek BR'de +0,23 getiriyor ama giyotin korpusunda 3,38
            // puan kaybettiriyor. Ikisi de gercek yuk bicimleri, dolayisiyla
            // sira karari kromozomda durur (R-C15a).
            void OpenNewWall()
            {
                // Elde bolge ICI bir aday varsa is bitti. Bolge DISI bir aday
                // varsa is bitmedi: yeni duvar kutuyu kendi bolgesine
                // yerlestirebilir ve o zaman bolge disi olani devirir (DR-40).
                if (bestInZone) return;

                var frontier = walls.Count > 0 ? walls[^1].End : 0m;
                var opened = TryPlace(input, ledger, placements, sequenced, fillFromMaxX,
                    frontier, depthBudget, zoneStart, zoneEnd, remaining, decoder.WallDepthPreference);

                blockedByFragility |= opened.BlockedByFragility;

                if (opened.Box is null) return;
                if (best is not null && !opened.InZone) return;

                bestInZone = opened.InZone;
                best = opened.Box;
                blockZLimit = best.Z + best.Length;
                walls.Add(new WallSegment(best.Z, best.Z + best.Length));
            }

            // Duvar bandi olmadan tum defteri tara. Olcum, yerlesemeyen kutularin
            // %75,5'inin kalan bir bosluga GEOMETRIK olarak sigdigini gosterdi
            // (300 senaryo) — yani hacim vardi, kutu da sigiyordu, onu disarida
            // birakan sey duvar bandiydi.
            //
            // Duvar disiplini bir CIKTI BICIMIDIR, fiziksel kural degil: sahadaki
            // yukleme pratigine uyan bir plan uretmek icin vardir. Kutuyu bandi
            // yuzunden disarida birakmak, bicimi doluluga tercih etmek olurdu.
            void ScanPockets()
            {
                if (bestInZone) return;

                var anywhere = TryPlace(input, ledger, placements, sequenced, fillFromMaxX,
                    0m, depthBudget, zoneStart, zoneEnd, remaining, 0m);

                blockedByFragility |= anywhere.BlockedByFragility;

                if (anywhere.Box is null) return;
                if (best is not null && !anywhere.InZone) return;

                bestInZone = anywhere.InZone;
                best = anywhere.Box;
                blockZLimit = null;
            }

            if (decoder.PocketBeforeNewWall)
            {
                ScanPockets();
                OpenNewWall();
            }
            else
            {
                OpenNewWall();
                ScanPockets();
            }

            // Kutu hedefe sigmadi ama arac hala uzun: hedefi buyut ve iki yedek
            // yolu yeniden dene. Bu adim olmadan pay bir doluluk kaybina
            // donerdi; boylece pay yalnizca yuku one topluyor, ne kadarinin
            // kullanildigini degistirmiyor.
            //
            // Duvar dongusu tekrarlanmaz: duvar bantlari zaten hedeften
            // bagimsizdir ve bir kez tarandiklarinda cevaplari degismez.
            while (best is null && depthBudget is { } budget && budget < input.VehicleLength)
            {
                depthBudget = Math.Min(input.VehicleLength, budget * DepthRelaxStep);

                if (decoder.PocketBeforeNewWall)
                {
                    ScanPockets();
                    OpenNewWall();
                }
                else
                {
                    OpenNewWall();
                    ScanPockets();
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

            // Yerlesen birim TUKETILMIS sayilir. Tek yonlu ilerleyen bir
            // dongude bu gereksizdi — indeks bir daha ziyaret edilmiyordu — ve
            // yazilmamis bir varsayim olarak duruyordu. Ileri bakisli arama
            // yarim bir durumdan DEVAM ettigi icin varsayim cokuyor: dongu
            // bastan basliyor ve zaten yerlesmis kutulari yeniden yerlestiriyor.
            // Olculdu: 500 kutuluk senaryoda 518 kutu yerlesti (docs/algorithm/02-kararlar.md DR-49).
            consumed[index] = true;

            totalWeight += best.Weight;
            ledger.Place(best.X, best.Y, best.Z, best.Width, best.Height, best.Length, minSide);

            // Blok z ekseninde buyurken duvar bandini VE bolgeyi birden asamaz.
            // Bolge sinirini eklemeden once blok, taban kutunun bolgesinden
            // tasip bir sonraki grubun alanina giriyordu (DR-40).
            var blockLimit = Math.Min(blockZLimit ?? input.VehicleLength, zoneEnd ?? input.VehicleLength);

            RaiseBlock(input, ledger, placements, instances, consumed, index + 1,
                best, minSide, fillFromMaxX, blockLimit, groupZones, ref totalWeight);

            // Yerlesim durumu degisti: onceki basarisizliklar artik gecerli degil.
            failedSincePlacement.Clear();
        }

        // SON GECIS. Ana dongu TEK YONLUDUR: bir kutu yerlesemediginde bir daha
        // denenmez. Ama yerlesim durumu sonradan degisir — arkasindan gelen
        // kutular platform kurar ve erken elenen kutunun yeri ACILIR.
        //
        // Olculdu (BR15, %100 yuk): 27 yerlesemeyen kalemin 21'i SON yerlesimde
        // %80 destek esigini gecen bir konuma sahipti. Yani kayip, yer olmadigi
        // icin degil, yer sonradan actigi icin olusuyordu.
        //
        // Gecis ilerleme durana kadar yinelenir: bir kutunun yerlesmesi bir
        // sonrakine platform kurabilir.
        RetryUnplaced(input, ledger, placements, instances, unplaced, groupZones,
            fillFromMaxX, minSide, depthBudget, ref totalWeight, cancellationToken);

        state.TotalWeight = totalWeight;
        state.DepthBudget = depthBudget;

        return (
            PlanResultBuilder.Build(
                placements, unplaced, input.VehicleWidth, input.VehicleHeight, input.VehicleLength,
                walls: walls),
            state);
    }

    /// <summary>
    /// Yerlesemeyen kutulari, ana dongu bittikten sonra defterin SON haliyle
    /// yeniden dener. Duvar bandi yoktur (cep taramasiyla ayni kademe); bolge
    /// ve derinlik butcesi korunur.
    ///
    /// Blok orulmez: bunlar artiklardir ve tek tek yerlesirler. Blok denemek
    /// hem pahali olurdu hem de artiklarin ayni tipten komsusu genelde kalmaz.
    ///
    /// Determinizm (R-C02): liste sirasinda gezilir, rastgelelik yoktur.
    /// </summary>
    private static void RetryUnplaced(
        OptimizationInput input,
        SpaceLedger ledger,
        List<PlacedBox> placements,
        IReadOnlyList<SequencedItem> instances,
        List<UnplacedBox> unplaced,
        Dictionary<int, (decimal ZStart, decimal ZEnd)> groupZones,
        bool fillFromMaxX,
        decimal minSide,
        decimal? depthBudget,
        ref decimal totalWeight,
        CancellationToken cancellationToken)
    {
        if (unplaced.Count == 0) return;

        var byItem = new Dictionary<Guid, SequencedItem>();
        foreach (var instance in instances) byItem.TryAdd(instance.Item.ItemId, instance);

        var progressed = true;

        while (progressed)
        {
            progressed = false;

            for (var index = unplaced.Count - 1; index >= 0; index--)
            {
                cancellationToken.ThrowIfCancellationRequested();

                if (!byItem.TryGetValue(unplaced[index].ItemId, out var sequenced)) continue;

                var item = sequenced.Item;
                if (totalWeight + item.Weight > input.VehicleMaxWeight) continue;

                decimal? zoneStart = null;
                decimal? zoneEnd = null;
                if (groupZones.TryGetValue(item.UnloadingOrder ?? -1, out var zone))
                {
                    zoneStart = zone.ZStart;
                    zoneEnd = zone.ZEnd;
                }

                var attempt = TryPlace(input, ledger, placements, sequenced, fillFromMaxX,
                    0m, depthBudget, zoneStart, zoneEnd, remaining: 1, 0m);

                if (attempt.Box is not { } box) continue;

                placements.Add(box);
                totalWeight += box.Weight;
                ledger.Place(box.X, box.Y, box.Z, box.Width, box.Height, box.Length, minSide);
                unplaced.RemoveAt(index);
                progressed = true;
            }
        }
    }

    /// <summary>
    /// SABIT yerlesimlerin uzerine yalnizca KALAN kutulari koyar.
    ///
    /// Neden gerekiyor: arayuzde plana bir urun eklendiginde bugun motor
    /// cagrilmiyor, frontend kendi paketleyicisiyle konum uyduruyor (G-1). O
    /// paketleyici motorun sekiz sert kapisinin altisini uygulamiyor ve
    /// destek/kirilganlik/istif/bolge kontrolleri sessizce atlaniyor. Tam
    /// yeniden optimizasyon ise mevcut kutulari da oynatir; kullanici "elle
    /// koydugum kutu nereye gitti" der.
    ///
    /// Bu yol ikisinin arasidir: gelen yerlesimler DOKUNULMAZ, defter onlarla
    /// doldurulur ve yalnizca eslesmeyen birimler yerlestirilir. Butun kapilar
    /// motorun kendisinden gelir, cunku ayni yerlestirici kosar.
    ///
    /// Eslestirme urun kimligine gore yapilir: ayni tipten birimler birbirinin
    /// ayni oldugu icin hangisinin sabit oldugu onemsizdir. Girdide karsiligi
    /// olmayan sabit yerlesim yok sayilir — o urun listeden cikarilmis demektir.
    ///
    /// Donen sonuc SABITLERI DE ICERIR: <see cref="PlacementState.Placements"/>
    /// onlarla baslar ve uzerine eklenir, yani cagiran taraf plani tek parca
    /// olarak kaydedebilir.
    /// </summary>
    internal static OptimizationResult RunFrom(
        OptimizationInput input,
        IReadOnlyList<PlacedBox> fixedBoxes,
        CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(input);
        ArgumentNullException.ThrowIfNull(fixedBoxes);

        var expanded = input.Items.SelectMany(i => Enumerable.Range(0, i.Quantity).Select(_ => i));
        var instances = ItemOrdering
            .SortForGroupPlacement(expanded, input.Criteria, input.ClusterGroups)
            .Select(SequencedItem.Plain)
            .ToList();

        var modules = OptimizationModules.Resolve(input);
        var lifo = modules.UseLifo && instances.Exists(i => i.Item.UnloadingOrder.HasValue);
        var state = PlacementState.Fresh(input, instances.Count, DepthBudget(input, instances, lifo));

        var minSide = instances.Count == 0
            ? 0m
            : instances.Min(i => Math.Min(i.Item.Width, Math.Min(i.Item.Height, i.Item.Length)));

        var consumed = state.Consumed;

        foreach (var box in fixedBoxes)
        {
            var index = -1;
            for (var position = 0; position < instances.Count; position++)
            {
                if (consumed[position] || instances[position].Item.ItemId != box.ItemId) continue;

                index = position;
                break;
            }

            // Girdide karsiligi kalmamis sabit yerlesim: urun listeden
            // cikarilmis demektir, sessizce dusurulur.
            if (index < 0) continue;

            consumed[index] = true;
            state.Placements.Add(box);
            state.TotalWeight += box.Weight;
            state.Ledger.Place(box.X, box.Y, box.Z, box.Width, box.Height, box.Length, minSide);
        }

        return Run(input, instances, DecoderKeys.Neutral, state, cancellationToken).Result;
    }

    /// <summary>Hedef derinligin buyutulme adimi; her basarisizlikta tavan bu kadar acilir.</summary>
    private const double VcsTieEpsilon = 1e-9d;

    private const decimal DepthRelaxStep = 1.10m;

    /// <summary>
    /// Yukun toplanacagi hedef derinlik. <c>null</c> ise sinir yoktur —
    /// bugunku davranis.
    /// </summary>
    private static decimal? DepthBudget(
        OptimizationInput input,
        IReadOnlyList<SequencedItem> instances,
        bool lifo)
    {
        // LIFO varken hedef derinlik UYGULANMAZ. Ikisi ayni ekseni farkli
        // amaclarla kullaniyor: hedef derinlik yuku ONE toplamak ister, LIFO ise
        // her grubu kendi z bandina yayar — ilk inecek grup kapiya en yakin.
        //
        // Ikisi ayni anda calisinca hedef, arkadaki grubun bandini kesiyor ve
        // o grubun kutulari bolgesine hic ulasamiyor. Olculdu: alti kutunun
        // ikisi bolge disina tasti ve dort LIFO testi kirildi (DR-40'in
        // kapattigi hatanin aynisi baska bir yoldan).
        //
        // Cakismada LIFO kazanir: bosaltma sirasi bir IS KURALI, yogunlastirma
        // ise bir TERCIH.
        if (lifo) return null;

        if (input.DepthSlack is not { } slack || slack <= 0m) return null;

        var face = input.VehicleWidth * input.VehicleHeight;
        if (face <= 0m) return null;

        var volume = instances.Sum(i => i.Item.Width * i.Item.Height * i.Item.Length);

        return Math.Min(input.VehicleLength, volume / face * slack);
    }

    /// <summary>
    /// Blok insasi (Eley 2002), kule insasinin (Gehring &amp; Bortfeldt 1997)
    /// genellestirilmis hali: yeni yerlesen kutunun cevresine, ayni urunun kalan
    /// birimlerinden bir prizma orulur.
    ///
    /// Buyume x ve y'de serbesttir; z'de ise DUVAR BANDIYLA sinirlidir. Bandi
    /// asmak bir sonraki duvarin icine tasmak olurdu ve duvar disiplini kalirdi
    /// (R-C08). Yeni acilan duvarda bandin derinligi zaten ilk kutunun z olcusu
    /// oldugu icin blok orada tek sira kalir. Sonuc, duvarin yuzunu ayni kutuyla
    /// oren bir prizma — sahadaki yukleme pratiginin birebir karsiligi.
    ///
    /// Gerekcesi olculmustur. Kule tek sutunla sinirliyken BR1 (uc tip, bol
    /// tekrar) bizim EN KOTU kumemizdi (%81,26) halbuki literaturde en kolayidir:
    /// tekrarin en yuksek oldugu yerde en az kazaniyorduk, cunku yerlestirici
    /// ayni olcudeki kutu coklugunu bir firsat olarak gormuyordu (`DR-21`).
    ///
    /// Yedi kapinin tamami yine <see cref="PlacementValidator"/> uzerinden
    /// sorulur; blok kendi destek ya da istif tanimini yazmaz.
    /// </summary>
    private static void RaiseBlock(
        OptimizationInput input,
        SpaceLedger ledger,
        List<PlacedBox> placements,
        IReadOnlyList<SequencedItem> instances,
        bool[] consumed,
        int from,
        PlacedBox baseBox,
        decimal minSide,
        bool fillFromMaxX,
        decimal zLimit,
        IReadOnlyDictionary<int, (decimal ZStart, decimal ZEnd)> groupZones,
        ref decimal totalWeight)
    {
        // Aynalanmis modda blok sola buyur; aksi halde ayni plan aynalandiginda
        // blok duvardan tasardi.
        var reach = fillFromMaxX ? baseBox.X + baseBox.Width : input.VehicleWidth - baseBox.X;
        var columns = (int)(reach / baseBox.Width);
        var rows = (int)((zLimit - baseBox.Z) / baseBox.Length);

        for (var k = 0; k < rows; k++)
        {
            var z = baseBox.Z + k * baseBox.Length;
            var filled = 0;

            for (var i = 0; i < columns; i++)
            {
                var x = fillFromMaxX
                    ? baseBox.X - i * baseBox.Width
                    : baseBox.X + i * baseBox.Width;

                // Taban kutu zaten yerlesik: kendi sutunu onun USTUNDEN devam eder.
                var startY = k == 0 && i == 0 ? baseBox.Y + baseBox.Height : baseBox.Y;

                var placed = FillColumn(input, ledger, placements, instances, consumed, from,
                    baseBox, x, z, startY, minSide, groupZones, ref totalWeight);

                filled += placed;
                if (placed == 0) break;
            }

            if (k > 0 && filled == 0) break;
        }
    }

    /// <summary>
    /// Verilen ayakta, verilen yukseklikten baslayarak ayni urunun birimlerini
    /// ust uste dizer ve dizilen sayiyi dondurur.
    ///
    /// Ilk basarisizlikta durur: ayni urun kimligi ayni olculeri ve ayni istif
    /// kisitlarini tasir, dolayisiyla bir birim gecemiyorsa ayni noktada sonraki
    /// de gecemez.
    /// </summary>
    private static int FillColumn(
        OptimizationInput input,
        SpaceLedger ledger,
        List<PlacedBox> placements,
        IReadOnlyList<SequencedItem> instances,
        bool[] consumed,
        int from,
        PlacedBox baseBox,
        decimal x,
        decimal z,
        decimal startY,
        decimal minSide,
        IReadOnlyDictionary<int, (decimal ZStart, decimal ZEnd)> groupZones,
        ref decimal totalWeight)
    {
        var width = baseBox.Width;
        var height = baseBox.Height;
        var length = baseBox.Length;

        var top = startY;
        var count = 0;

        while (true)
        {
            var next = NextUnit(instances, consumed, from, baseBox.ItemId);
            if (next < 0) break;

            var item = instances[next].Item;

            if (top + height > input.VehicleHeight) break;
            if (totalWeight + item.Weight > input.VehicleMaxWeight) break;

            if (PlacementValidator.HasOverlap(placements, x, top, z, width, height, length)) break;
            if (!PlacementValidator.HasSupport(placements, x, top, z, width, length,
                PlacementValidator.ThresholdOf(input))) break;
            if (OptimizationModules.Resolve(input).UseLifo
                    && PlacementValidator.ViolatesUnloadPath(
                placements, x, top, z, width, height, length, item.UnloadingOrder)) break;
            if (PlacementValidator.ViolatesStackability(placements, x, top, z, width, length,
                input.Criteria == LoadingPlanOptimizationCriteria.Lifo ? item.UnloadingOrder : null)) break;
            if (PlacementValidator.ViolatesStackCount(placements, x, top, z, width, length)) break;
            if (PlacementValidator.ViolatesStackWeight(placements, x, top, z, width, length, item.Weight)) break;
            if (PlacementValidator.ViolatesFragility(placements, x, top, z, width, length)) break;

            // Blok, ana dongunun aday taramasini atlar; sekizinci kapi burada da
            // sorulmak zorunda (OPT-15).
            if (PlacementValidator.ViolatesLoadAbove(placements, x, top, z, width, height, length,
                item.IsStackable, item.FragilityType, item.MaxStackCount, item.MaxWeightOnTop)) break;

            placements.Add(Create(item, x, top, z, width, height, length, baseBox.Rotation));
            totalWeight += item.Weight;
            ledger.Place(x, top, z, width, height, length, minSide);
            consumed[next] = true;

            top += height;
            count++;
        }

        // Ayni urun artik sigmiyor ama sutunun ustunde yer kalmis olabilir.
        // BILESIK BLOK (Zhu vd. 2012): kalan yuksekligi baska bir urunle
        // tamamla. Aday, sutunun ayak izini ASMAYAN ilk yerlesmemis kutudur —
        // tasarsa blok bir prizma olmaktan cikardi.
        count += TopUp(input, ledger, placements, instances, consumed, from,
            baseBox, x, z, top, minSide, groupZones, ref totalWeight);

        return count;
    }

    /// <summary>
    /// Sutunun ustunde kalan yuksekligi baska bir urunle doldurur.
    ///
    /// Gerekcesi olculmustur: kayip hacmin tamami yiginin USTUNDE (olu hava
    /// %8,6-13), ic bosluk sifira yakin. Yani sorun kutularin arasinda degil,
    /// sutunun tepesinde kalan ve o urune yetmeyen bosluk.
    ///
    /// Yedi kapi yine <see cref="PlacementValidator"/> uzerinden sorulur.
    /// </summary>
    private static int TopUp(
        OptimizationInput input,
        SpaceLedger ledger,
        List<PlacedBox> placements,
        IReadOnlyList<SequencedItem> instances,
        bool[] consumed,
        int from,
        PlacedBox baseBox,
        decimal x,
        decimal z,
        decimal top,
        decimal minSide,
        IReadOnlyDictionary<int, (decimal ZStart, decimal ZEnd)> groupZones,
        ref decimal totalWeight)
    {
        var count = 0;

        for (var j = from; j < instances.Count; j++)
        {
            if (consumed[j]) continue;

            var item = instances[j].Item;
            if (item.ItemId == baseBox.ItemId) continue;

            // Bilesik blok BASKA bir urunu tasiyor; o urunun KENDI bosaltma
            // bolgesi taban kutununkinden farkli olabilir. Sorulmadiginda kutu
            // bir baskasinin bolgesine yerlesiyordu ve LIFO sozu sessizce
            // deliniyordu (DR-40). Dikey LIFO kurali zaten
            // ViolatesStackability'de; eksik olan BOLGE kuraliydi.
            var hasZone = groupZones.TryGetValue(item.UnloadingOrder ?? -1, out var itemZone);

            foreach (var (width, height, length, rotation) in PlacementValidator.GetOrientations(item))
            {
                if (hasZone && !LifoPlacement.IsInsideZone(itemZone.ZStart, itemZone.ZEnd, z, length)) continue;
                if (width > baseBox.Width || length > baseBox.Length) continue;

                // Ayak izi uyumu: kucuk bir kutuyu genis bir sutunun tepesine
                // koymak o yuzeyin geri kalanini olu havaya cevirir. Blok ancak
                // ust kat tabani buyuk olcude kapatiyorsa bilesik kalir.
                if (width * length < FootprintMatch * baseBox.Width * baseBox.Length) continue;
                if (top + height > input.VehicleHeight) continue;
                if (totalWeight + item.Weight > input.VehicleMaxWeight) continue;

                if (PlacementValidator.HasOverlap(placements, x, top, z, width, height, length)) continue;
                if (!PlacementValidator.HasSupport(placements, x, top, z, width, length,
                    PlacementValidator.ThresholdOf(input))) continue;
                if (OptimizationModules.Resolve(input).UseLifo
                    && PlacementValidator.ViolatesUnloadPath(
                    placements, x, top, z, width, height, length, item.UnloadingOrder)) continue;
                if (PlacementValidator.ViolatesStackability(placements, x, top, z, width, length,
                    input.Criteria == LoadingPlanOptimizationCriteria.Lifo ? item.UnloadingOrder : null)) continue;
                if (PlacementValidator.ViolatesStackCount(placements, x, top, z, width, length)) continue;
                if (PlacementValidator.ViolatesStackWeight(placements, x, top, z, width, length, item.Weight)) continue;
                if (PlacementValidator.ViolatesFragility(placements, x, top, z, width, length)) continue;
                if (PlacementValidator.ViolatesLoadAbove(placements, x, top, z, width, height, length,
                    item.IsStackable, item.FragilityType, item.MaxStackCount, item.MaxWeightOnTop)) continue;

                placements.Add(Create(item, x, top, z, width, height, length, rotation));
                totalWeight += item.Weight;
                ledger.Place(x, top, z, width, height, length, minSide);
                consumed[j] = true;

                top += height;
                count++;
                break;
            }
        }

        return count;
    }

    /// <summary>
    /// Bosluga sigacak BLOGUN kac kutu aldigi. Cok olan kazanir; esitlikte eski
    /// tek-kutu olcutu (taban alani artigi) karar verir.
    ///
    /// Neden gerekli: blogu buyutmek tek basina hicbir sey degistirmedi (x, z ve
    /// x+z varyantlari, ucu de %79,03 → %79,04). Sebebi, ana dongunun zaten ayni
    /// sonucu uretmesi: ayni urunun sonraki birimi bir sonraki turda o komsu
    /// bosluga nasil olsa gidiyordu. Degismeyen sey aday SECIMIYDI — skor "bu
    /// bosluga BIR kutu ne kadar siki oturur" diye soruyor ve dar bosluklari
    /// odullendiriyordu, oysa blok icin dogru soru "bu bosluk kac kutu alir".
    ///
    /// Olcut HACIM degil ADET olmali. Uc bicim denendi: blok artigini kucultmek
    /// %79,60, blok hacmini buyutmek %79,84, blok adedini buyutmek %79,91. Ama
    /// asil fark giyotin korpusunda gorundu: hacim bicimi orada %76,30 → %75,41
    /// dusuruyordu, cunku o korpusta her kutu benzersiz oldugu icin blok daima
    /// tek kutudur ve olcut sessizce "en buyuk kutuyu sec"e donusuyordu. Adet
    /// biciminde ise tek kutu durumunda tum adaylar esitlenir ve karar eski
    /// olcute, yani sigdirmaya birakilir.
    /// </summary>
    private static int BlockCount(
        FreeSpace space,
        int remaining,
        decimal x, decimal y, decimal z,
        decimal width, decimal height, decimal length,
        decimal zLimit,
        bool fillFromMaxX)
    {
        // Blok, kutunun oturdugu koseden buyur; bosluğun tamami degil o koseden
        // itibaren kalan kisim sayilir.
        var reachX = fillFromMaxX ? x + width - space.X : space.MaxX - x;
        var reachZ = Math.Min(space.MaxZ, zLimit) - z;

        var nx = (int)(reachX / width);
        var ny = (int)((space.MaxY - y) / height);
        var nz = (int)(reachZ / length);

        return Math.Min(remaining, Math.Max(1, nx) * Math.Max(1, ny) * Math.Max(1, nz));
    }

    /// <summary>Bu urunden henuz yerlesmemis birim sayisi.</summary>
    private static int RemainingUnits(
        IReadOnlyList<SequencedItem> instances, bool[] consumed, int from, Guid itemId)
    {
        var count = 0;

        for (var j = from; j < instances.Count; j++)
        {
            if (!consumed[j] && instances[j].Item.ItemId == itemId) count++;
        }

        return count;
    }

    /// <summary>Ayni urunden henuz yerlesmemis ilk birimin sirasi; yoksa -1.</summary>
    private static int NextUnit(
        IReadOnlyList<SequencedItem> instances, bool[] consumed, int from, Guid itemId)
    {
        for (var j = from; j < instances.Count; j++)
        {
            if (!consumed[j] && instances[j].Item.ItemId == itemId) return j;
        }

        return -1;
    }

    /// <summary>
    /// Bir tarama denemesinin sonucu. <c>InZone</c> ayri tasinir cunku cagiran
    /// "aday buldum mu" ile "aday KENDI bolgesinde mi" sorularini ayirmak
    /// zorunda: bolge disi bir adayda taramayi durdurmak LIFO sozunu deler
    /// (DR-40).
    /// </summary>
    private readonly record struct Attempt(PlacedBox? Box, bool InZone, bool BlockedByFragility);

    /// <summary>
    /// Bir z bandi. Derinligini o banda giren ilk kutu belirler (G&amp;R kurali).
    ///
    /// Duvar icinde y ekseninde SERIT bandi denendi ve doluluk %75,08 → %50,49'a
    /// coktu: seridin yuksekligini ilk kutu belirleyince o duvara giren tum
    /// kutular o yukseklige mahkum kaliyor ve cogu disarida kaliyor. Bant
    /// disiplini z ekseninde ise yariyor, y ekseninde bogyor.
    /// </summary>

    /// <summary>
    /// Aday karsilastirma anahtari (bosluk x yonelim). Kucuk olan kazanir;
    /// <c>Rotation</c> son eslik bozucudur ve determinizmi garanti eder.
    ///
    /// <c>Flatness</c>'in sirasi olcumle secildi. Sigdirmanin ONUNE alinca
    /// kaybediyor (%75,99 → %75,30): "biraz daha hizali ama kotu oturan" adayi
    /// seciyor. Tam hizalanmayi ikili bayrakla one almak da kaybediyor (%76,06).
    /// Normalize edilmis agirlikli toplam da kazandirmadi (α=0 → %76,04,
    /// α=0,75 → %75,99). Kazanan bicim bu: sigdirmanin ARDINDAN, esit oturan
    /// adaylar arasinda karar vermek — %76,23 ve en kotu senaryo %60,16 →
    /// %62,89. Duzluk bir tercih olarak degerli, kisit olarak degil
    /// (docs/algorithm/01-kurallar.md R-C09b).
    /// </summary>
    private readonly record struct OrientationFit(
        decimal Y,
        decimal WallDepthKey,
        int NegativeBlockCount,
        decimal Residual,
        decimal Flatness,
        decimal DepthWaste,
        decimal NegativeBaseArea,
        decimal CornerDistance,
        LoadingPlanPlacementRotation Rotation)
    {
        public bool IsBetterThan(OrientationFit other)
        {
            var byY = Y.CompareTo(other.Y);
            if (byY != 0) return byY < 0;

            // Yeni duvar acilirken derinlik tercihi; mevcut duvara yerlesirken
            // deger daima sifirdir ve bu anahtar sessizce atlanir.
            var byWallDepth = WallDepthKey.CompareTo(other.WallDepthKey);
            if (byWallDepth != 0) return byWallDepth < 0;

            var byBlock = NegativeBlockCount.CompareTo(other.NegativeBlockCount);
            if (byBlock != 0) return byBlock < 0;

            var byResidual = Residual.CompareTo(other.Residual);
            if (byResidual != 0) return byResidual < 0;

            var byFlat = Flatness.CompareTo(other.Flatness);
            if (byFlat != 0) return byFlat < 0;

            var byDepth = DepthWaste.CompareTo(other.DepthWaste);
            if (byDepth != 0) return byDepth < 0;

            var byBase = NegativeBaseArea.CompareTo(other.NegativeBaseArea);
            if (byBase != 0) return byBase < 0;

            // Baslangic kosesine yakinlik. Greedy'de bunu VolumeScoring.WidthTerm
            // yapiyordu (katsayi 1, en zayif terim) ve gorevi ayniydi: esit
            // adaylar arasinda yukleme kosesine yakin olani sec. Terim duvar
            // orucude yoktu ve kazanani defter sirasi belirliyordu — yukleme
            // kosesi sozlesmesi (docs/COORDINATE_STANDARD.md §7) boylece
            // beraberlikte kayboluyordu.
            var byCorner = CornerDistance.CompareTo(other.CornerDistance);

            return byCorner != 0 ? byCorner < 0 : Rotation < other.Rotation;
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
        decimal? zoneEnd,
        int remaining,
        decimal depthPreference)
    {
        var item = sequenced.Item;
        var supportThreshold = PlacementValidator.ThresholdOf(input);
        var vcsWeights = input.VcsWeights is { } w
            ? new BlockValue.Weights(w.Volume, w.Waste, w.Contact, w.BoxCount)
            : BlockValue.Weights.Default;
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
        var bestVcs = double.MinValue;
        var bestZoneVcs = double.MinValue;
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

                // Bolge ILERIDEYSE aday bolge basina cekilir. Greedy'de bolge
                // baslangiclari extreme-point olarak tohumlaniyordu; duvar
                // orucude oyle bir tohum yok ve defterdeki bosluk z = 80'den
                // basliyorsa aday hep 80'de doguyordu — kutu bolgesi
                // [100, 200) olsa bile. Uc LIFO testi bu yuzden kirilmisti
                // (DR-40). Bosluk bolge basina yetmiyorsa dogal z korunur ve
                // aday yedek kademeye kalir; boylece kutu bolgesi yuzunden
                // disarida birakilmaz.
                if (zoneStart.HasValue && zoneStart.Value > z && zoneStart.Value + length <= space.MaxZ)
                {
                    z = zoneStart.Value;
                }

                if (z + length > space.MaxZ) continue;
                if (zLimit.HasValue && z + length > zLimit.Value) continue;

                if (x < 0m || x + width > input.VehicleWidth) continue;
                if (y + height > input.VehicleHeight) continue;
                if (z + length > input.VehicleLength) continue;

                // Cakisma kontrolu YOK ve bu bilincli: aday, defterdeki BOS bir
                // bosluğun icinde doguyor. x, y ve z bosluk sinirlarina kirpili,
                // olculer de space.Fits ile sinanmis; yani kutu tamamen o
                // bosluğun icinde. Bosluk tanimi geregi hicbir yerlesik kutuyla
                // kesismiyor, dolayisiyla cakisma imkansiz.
                //
                // Kontrol sicak dongude yerlesik kutu basina bir tarama demekti
                // ve arama butcesi duvar saati oldugu icin o sure dogrudan
                // iterasyondan gidiyordu. Ciktinin degismedigi olculdu; blok ve
                // bilesik blok defterin disina yerlestirdigi icin ORADA kontrol
                // duruyor.
                // Kose desteksizse pes ETME: bosluk icinde, ALTTAKI destek
                // kutularinin kenarlarina hizali konumlar denenir (G-5).
                if (!PlacementValidator.HasSupport(placements, x, y, z, width, length, supportThreshold))
                {
                    (x, z) = SupportAligned(placements, space, x, y, z, width, length, zFloor, supportThreshold);

                    if (z + length > space.MaxZ) continue;
                    if (zLimit.HasValue && z + length > zLimit.Value) continue;
                    if (x < 0m || x + width > input.VehicleWidth) continue;
                    if (z + length > input.VehicleLength) continue;

                    if (!PlacementValidator.HasSupport(placements, x, y, z, width, length, supportThreshold)) continue;
                }
                if (PlacementValidator.ViolatesStackability(placements, x, y, z, width, length,
                    input.Criteria == LoadingPlanOptimizationCriteria.Lifo ? item.UnloadingOrder : null)) continue;
                if (OptimizationModules.Resolve(input).UseLifo
                    && PlacementValidator.ViolatesUnloadPath(
                    placements, x, y, z, width, height, length, item.UnloadingOrder)) continue;
                if (PlacementValidator.ViolatesStackCount(placements, x, y, z, width, length)) continue;
                if (PlacementValidator.ViolatesStackWeight(placements, x, y, z, width, length, item.Weight)) continue;
                if (PlacementValidator.ViolatesFragility(placements, x, y, z, width, length))
                {
                    blockedByFragility = true;
                    continue;
                }

                // Sekizinci kapi: adayin KENDI kisitlari. Digerleri asagi bakar,
                // bu yukari — cebe yerlesen kutunun ustunde zaten yuk olabilir
                // (OPT-15). Kisitsiz kutuda maliyeti sifirdir.
                if (PlacementValidator.ViolatesLoadAbove(placements, x, y, z, width, height, length,
                    item.IsStackable, item.FragilityType, item.MaxStackCount, item.MaxWeightOnTop)) continue;

                // Bosluklar arasinda en sıkı oturan kazanir (best-fit): once alcak
                // katman — yercekimi tercihi korunur — sonra bosluktan artan hacim.
                // Sira sozlukbilimseldi; F7-3'te VCS agirlikli carpimi one
                // gecti ve bu anahtar eslik bozucuya indi (asagiya bakiniz).
                // Artik HACIM degil TABAN ALANI uzerinden olculur. Olcum,
                // yerlesemeyen kutularin %73'unun bir bosluga sigdigini ama
                // yalnizca %2,5'inin orada destek buldugunu gosterdi: kalan bos
                // hacim dikey bacalar ve cikintilar halinde, tabanlari kismen
                // havada. Kutu bosluğun ayak izini tam kaplarsa ustunde TAM
                // PLATFORM birakir; yarim kaplarsa cikinti uretir ve o cikinti
                // bir daha kullanilamaz.
                var block = BlockCount(space, remaining, x, y, z, width, height, length,
                    zLimit ?? input.VehicleLength, fillFromMaxX);

                var (topDeviation, neighbourContact) =
                    Neighbourhood(placements, x, y, z, width, height, length);

                var candidate = new OrientationFit(
                    y, depthPreference * length,
                    -block, space.Width * space.Length - width * length,
                    topDeviation,
                    space.MaxZ - (z + length), -(width * length),
                    fillFromMaxX ? input.VehicleWidth - (x + width) : x,
                    rotation);

                // Aday secimi VCS ile yapilir (F7-3): sozlukbilimsel anahtar
                // yerine AGIRLIKLI CARPIM. Yukaridaki yorumun "toplam olsaydi
                // kalibrasyon yeni bir borc olurdu" gerekcesi olculdu ve
                // kismen yaniltici cikti: kalibre EDILMEMIS bir carpim bile
                // sozlukbilimsel anahtari geciyor.
                //
                //   static  %82,61 -> %83,26  (+0,65)
                //   GRASP   %87,73 -> %88,10  (+0,37)
                //
                // Kazanc heterojenlikle BUYUYOR: BR1 -0,31, BR7 +1,60. Sebep
                // muhtemelen su — sozlukbilimsel sira az cesitli yukte iyi
                // calisan bir onceliklendirmeydi (once yercekimi, sonra duvar
                // derinligi...); cok cesitli yukte terimler arasinda odunlesme
                // gerekiyor ve sert oncelik bunu yapamiyor.
                //
                // <c>OrientationFit</c> KALDIRILMADI: VCS esitliginde eslik
                // bozucu olarak kullaniliyor. Determinizm (R-C02) bunu
                // gerektirir; iki aday ayni degeri aldiginda kazanani defter
                // sirasina birakmak makineye bagli cikti uretirdi.
                var itemMin = Math.Min(width, Math.Min(height, length));
                var wallContact =
                    (x <= 0m || x + width >= input.VehicleWidth ? height * length : 0m)
                    + (z <= 0m ? width * height : 0m);
                var vcs = BlockValue.Score(
                    placedVolume: width * height * length * block,
                    spaceVolume: space.Width * space.Height * space.Length,
                    unusableVolume: BlockValue.UnusableResidual(
                        space.Width, space.Height, space.Length, width, height, length, itemMin),
                    contactArea: width * length + wallContact + neighbourContact,
                    boxCount: Math.Max(1, block),
                    weights: vcsWeights);

                if (bestFit is null || vcs > bestVcs
                    || (Math.Abs(vcs - bestVcs) < VcsTieEpsilon && candidate.IsBetterThan(bestFit.Value)))
                {
                    bestVcs = vcs;
                    bestFit = candidate;
                    best = Create(item, x, y, z, width, height, length, rotation);
                }

                if (LifoPlacement.IsInsideZone(zoneStart, zoneEnd, z, length)
                    && (bestZoneFit is null || vcs > bestZoneVcs
                        || (Math.Abs(vcs - bestZoneVcs) < VcsTieEpsilon && candidate.IsBetterThan(bestZoneFit.Value))))
                {
                    bestZoneVcs = vcs;
                    bestZoneFit = candidate;
                    bestInZone = Create(item, x, y, z, width, height, length, rotation);
                }

            }
        }

        // Bolge kisiti burada sertlesir: bolge ici aday varsa o kazanir, yoksa
        // kutu yalnizca bolgesi dar kaldi diye dusmez (greedy ile ayni kademe).
        return bestInZone is not null
            ? new Attempt(bestInZone, InZone: true, blockedByFragility)
            : new Attempt(best, InZone: false, blockedByFragility);
    }

    /// <summary>
    /// Aday konum sayisinin ust siniri, eksen basina. Konumlar destek kutusu
    /// kenarlarindan dogar; tipik olarak bir bosluğun altinda birkac kutu olur,
    /// yani sinir nadiren baglar. Sicak dongude sinirsiz birakmak, arama
    /// butcesi duvar saati oldugu icin dogrudan iterasyondan giderdi.
    /// </summary>
    private const int SupportAlignedPerAxis = 6;

    /// <summary>
    /// Bosluk icinde, ALTTAKI destek kutularinin kenarlarina hizali ilk YETERLI
    /// DESTEKLI taban konumu; yoksa gelen konum aynen doner.
    ///
    /// Neden gerekiyor: aday konum bugune kadar bosluk basina TEKTI — bosluğun
    /// kosesi. Kose desteksizse butun bosluk eleniyordu, yirmi santim ilerisi
    /// tam destekli olsa bile. Olculdu (BR15, %100 yuk): yerlesemeyen 27
    /// kalemin 21'inin son yerlesimde %80 esigini ZATEN gecen bir konumu vardi
    /// ve motor o noktayi hic denememisti. Ornek: BR15-T026 icin (0, 108, 318),
    /// %87,7 destek, sifir cakisma.
    ///
    /// Literaturdeki adi kose noktasi yerine UC NOKTA (extreme point) aday
    /// uretimidir (Crainic, Perboli &amp; Tadei, CIRRELT-2007-41).
    ///
    /// Konumlar bosluğun ICINDE kalir; boylece cagiran taraftaki "cakisma
    /// kontrolu gereksiz" degismezi korunur (bkz. ayni dosyadaki gerekce).
    ///
    /// Tarama <c>z</c> artan, sonra <c>x</c> artan sirada gider ve esigi gecen
    /// ILK konumda durur: <c>z</c> onceligi yukleme yonuyle ayni taraftadir ve
    /// sabit sira determinizmi (R-C02) korur.
    /// </summary>
    internal static (decimal X, decimal Z) SupportAligned(
        List<PlacedBox> placements,
        FreeSpace space,
        decimal x, decimal y, decimal z,
        decimal width, decimal length,
        decimal zFloor,
        decimal threshold)
    {
        // Zeminde destek zaten tamdir; buraya dusulmez ama ucuz bir korumadir.
        if (y <= 0m) return (x, z);

        var minX = space.X;
        var maxX = space.MaxX - width;
        var minZ = space.Z < zFloor ? zFloor : space.Z;
        var maxZ = space.MaxZ - length;

        if (maxX < minX || maxZ < minZ) return (x, z);

        var xs = new SortedSet<decimal>();
        var zs = new SortedSet<decimal>();

        foreach (var box in placements)
        {
            if (box.Y + box.Height != y) continue;

            // Yalnizca bu bosluğun ayak izine giren kutular destek olabilir.
            if (box.X >= space.MaxX || box.X + box.Width <= space.X) continue;
            if (box.Z >= space.MaxZ || box.Z + box.Length <= space.Z) continue;

            Offer(xs, box.X, minX, maxX);
            Offer(xs, box.X + box.Width - width, minX, maxX);
            Offer(zs, box.Z, minZ, maxZ);
            Offer(zs, box.Z + box.Length - length, minZ, maxZ);
        }

        if (xs.Count == 0 || zs.Count == 0) return (x, z);

        foreach (var candidateZ in zs)
        {
            foreach (var candidateX in xs)
            {
                if (candidateX == x && candidateZ == z) continue;

                if (PlacementValidator.SupportRatio(placements, candidateX, y, candidateZ, width, length) >= threshold)
                {
                    return (candidateX, candidateZ);
                }
            }
        }

        return (x, z);

        static void Offer(SortedSet<decimal> into, decimal value, decimal min, decimal max)
        {
            if (value < min || value > max) return;
            if (into.Count < SupportAlignedPerAxis) into.Add(value);
        }
    }

    /// <summary>
    /// Yerel duzluk cezasi: adayin ust yuzu, YANINDAKI kutularin ust yuzleriyle
    /// ne kadar ayni hizada bitiyor. Temas uzunluguyla agirliklandirilmis
    /// ortalama sapma; kucuk olan daha duz bir yuzey birakir.
    ///
    /// Olcum bunu isaret ediyor: yigin yuksekligi zaten %84,8 ama ust yuzey
    /// engebesi 56,6 cm ve olu havanin tamami (%15,2) o engebenin ustunde
    /// kaliyor. Kayip hacim yigin ICINDE degil, yiginin tepesindeki girinti
    /// cikintilarda.
    ///
    /// Komsuluk YERELDIR ve bu kasitli: kuresel hizalama denendi ve kaybetti
    /// (−0,55 puan, engebe kotulesti). Tek duzleme zorlanan sutunlar yerel
    /// uyumu bozuyor. Bu yuzden yalnizca temas eden ve ayni dikey bantta olan
    /// kutular sayilir (docs/algorithm/01-kurallar.md R-C09b, Ojha vd. 2020 WallE).
    /// </summary>
    /// <summary>
    /// Adayin komsulukla iliskisi: tepe sapmasi VE temas alani.
    ///
    /// Ikisi ayni taramadan cikar. Temas alani <c>CS(b)</c> terimidir (Araya,
    /// Guerrero &amp; Nunez 2017): komsu kutulara degen yuzey. Onceki surumde
    /// yalnizca taban ayak izi ve arac yuzeyleri sayiliyordu, komsu kutulara
    /// degme HIC sayilmiyordu.
    /// </summary>
    private static (decimal Deviation, decimal Contact) Neighbourhood(
        List<PlacedBox> placed,
        decimal x, decimal y, decimal z,
        decimal width, decimal height, decimal length)
    {
        var top = y + height;
        var weighted = 0m;
        var contact = 0m;
        var area = 0m;

        foreach (var b in placed)
        {
            // Ayni dikey bantta degilse komsu sayilmaz: alttaki katin kutusu
            // yan yana gorunur ama ayni yuzeyi paylasmaz.
            if (b.Y >= top || y >= b.Y + b.Height) continue;

            var touchX = b.X + b.Width == x || x + width == b.X;
            var touchZ = b.Z + b.Length == z || z + length == b.Z;
            if (!touchX && !touchZ) continue;

            var span = touchX
                ? Math.Min(z + length, b.Z + b.Length) - Math.Max(z, b.Z)
                : Math.Min(x + width, b.X + b.Width) - Math.Max(x, b.X);

            if (span <= 0m) continue;

            weighted += span * Math.Abs(top - (b.Y + b.Height));
            contact += span;

            // Paylasilan yuzun alani: yatay ortusme x dikey ortusme.
            area += span * (Math.Min(top, b.Y + b.Height) - Math.Max(y, b.Y));
        }

        return (contact == 0m ? 0m : weighted / contact, area);
    }

    private static PlacedBox Create(
        OptimizationItemInput item,
        decimal x, decimal y, decimal z,
        decimal width, decimal height, decimal length,
        LoadingPlanPlacementRotation rotation)
        => new(item.ItemId, x, y, z, width, height, length, rotation, item.Weight,
            item.IsStackable, item.MaxStackCount, item.MaxWeightOnTop, item.FragilityType, item.UnloadingOrder);

}
