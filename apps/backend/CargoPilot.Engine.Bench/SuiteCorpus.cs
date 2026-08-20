using System.Globalization;
using CargoPilot.Application.Common.Models;
using CargoPilot.Domain.Enums;

namespace CargoPilot.Engine.Bench;

/// <summary>
/// BUYUK SUIT — 2160 senaryo, dort aile, tek koşuda.
///
/// Neden ayri bir korpus: <see cref="ConstraintCorpus"/> kisitlari urun TIPINE
/// yaziyor — bir tipin butun birimleri birden gruplu ya da kirilgan oluyor.
/// Gercek sevkiyat oyle degildir: bir bosaltma noktasi karisik yuk alir, ayni
/// urunun bazi kutulari kirilgan olabilir. Tip duzeyinde atama iki kez OLCUM
/// HATASI uretti (`K-1` kirilganlik egrisi, `F9-3` istif dagilimi); suit
/// kisitlari tipin ICINDEN boler.
///
/// Cesitlilik ekseni butun ailelerde ayni: tip sayisi — BR merdiveninin ayni
/// ekseni (BR1 uc tip, BR7 yirmi tip). Dort kademe: ayni / az farkli /
/// cok farkli / tamamen farkli.
///
///   hacim        4 kademe x 150                              =  600
///   lifo         5 grup sayisi (2-6) x 4 kademe x 30          =  600
///   kirilganlik  4 pay (%5..%33, BIRIM duzeyinde) x 4 x 30    =  480
///   istif        4 varyant x 4 kademe x 30                    =  480
///
/// Aileler ORTOGONALDIR: her biri TEK bir seyi degistirir, boylece olculen fark
/// yalnizca ondan gelir. Birlestirmek ayri bir aile olur ve ayri olculur.
///
/// ARAC OLCULERI gercek tablodan gelir (<see cref="GercekCorpus.Vehicle"/>),
/// YUK yari gercek yari rastgeledir (<see cref="GercekCorpus.Box"/>) — ikisi de
/// duran urun kararlari. AGIRLIK LIMITI BAGLAYICI DEGILDIR.
///
/// URETIM DETERMINISTIKTIR (R-C02): senaryonun tohumu kimliginden turer, yani
/// tek bir senaryoyu yeniden uretmek icin butun suiti kosmak gerekmez.
/// </summary>
public static class SuiteCorpus
{
    /// <summary>Hacim tarafindaki senaryo sayisi, kademe basina.</summary>
    private const int VolumePerLevel = 150;

    /// <summary>LIFO tarafinda grup sayisi x kademe basina senaryo.</summary>
    private const int LifoPerCell = 30;

    /// <summary>Bir senaryonun yuk cesitliligi. Olcut TIP SAYISIDIR (BR ekseni).</summary>
    private sealed record Level(string Key, string Name, int Types);

    /// <summary>Bir urun tipinin olcusu, agirligi ve adedi.</summary>
    private sealed record Shape(decimal W, decimal H, decimal L, decimal Weight, int Quantity, bool Real, int Limit);

    private static readonly Level[] Levels =
    [
        new("ayni", "aynı yük", 1),
        new("az", "az farklı", 3),
        new("cok", "çok farklı", 8),
        new("tam", "tamamen farklı", 20),
    ];

    /// <summary>LIFO tarafinda taranan bosaltma grubu sayilari.</summary>
    internal static readonly int[] GroupCounts = [2, 3, 4, 5, 6];

    /// <summary>
    /// Kirilganlik tarafinda taranan paylar, YUZDE ve BIRIM duzeyinde.
    ///
    /// Neden birim duzeyinde: <see cref="ConstraintCorpus"/> kirilganligi urun
    /// TIPINE yaziyor ve bir tipin butun birimleri birden kirilgan oluyor.
    /// Senaryo basina 2-6 tip oldugu icin "yukun %5'i kirilgan" o yolla ifade
    /// EDILEMIYOR: pay seyreltildikce egri "bir tane kirilgan tip var"
    /// durumunda duzlesiyor (olculdu, `K-1`). Suit payi tipin ICINDEN boler.
    /// </summary>
    internal static readonly int[] FragileShares = [5, 10, 20, 33];

    /// <summary>Kirilganlik ve istif taraflarinda kume basina hucre senaryosu.</summary>
    private const int FragilePerCell = 30;
    private const int StackPerCell = 30;

    /// <summary>Kume numaralarinin tasindigi tabanlar.</summary>
    private const int FragileSetBase = 100;
    private const int StackSetBase = 200;

    /// <summary>
    /// Istif ekseninin varyantlari. Ilki bugunku kiyas ayarinin aynisi; kalan
    /// ucu <c>DR-38</c>'in acik kalan yarisini kapatir — <c>MaxWeightOnTop</c> ve
    /// <c>IsStackable = false</c> bugune kadar HICBIR korpusta olculmedi.
    /// </summary>
    internal enum StackKind
    {
        None = 0,

        /// <summary>Her uruude en fazla iki kutu ustte — bugunku ConstraintCorpus ayari.</summary>
        FixedTwo = 1,

        /// <summary>Tip basina degisken sinir; gercek sevkiyatta sinir urune ozgudur.</summary>
        Mixed = 2,

        /// <summary>Ust agirlik siniri: kutu kendi agirliginin katini tasir.</summary>
        WeightOnTop = 3,

        /// <summary>Birimlerin bir kismi hic istiflenemez.</summary>
        NotStackable = 4,
    }

    /// <summary>Suit kimlikleri; gorunumdeki sekmeler bunlardan turer.</summary>
    internal const string Volume = "hacim";
    internal const string Lifo = "lifo";
    internal const string Fragile = "kirilganlik";
    internal const string Stack = "istif";

    /// <summary>
    /// Kume numarasi: 0 = hacim · 2..6 = o kadar gruplu LIFO · 100 + pay =
    /// kirilganlik · 200 + varyant = istif. Grup sayisinin ve payin kume
    /// numarasina gomulmesi bilincli — tabloya bakan kisi ek bir esleme
    /// tablosuna ihtiyac duymasin.
    /// </summary>
    internal static IReadOnlyList<int> Sets =>
    [
        0,
        .. GroupCounts,
        .. FragileShares.Select(share => FragileSetBase + share),
        .. StackKinds.Select(kind => StackSetBase + (int)kind),
    ];

    private static readonly StackKind[] StackKinds =
        [StackKind.FixedTwo, StackKind.Mixed, StackKind.WeightOnTop, StackKind.NotStackable];

    internal static string SetLabel(int set)
    {
        if (set == 0) return "HACIM";

        if (set >= StackSetBase)
        {
            return (StackKind)(set - StackSetBase) switch
            {
                StackKind.FixedTwo => "IST2",
                StackKind.Mixed => "ISTKAR",
                StackKind.WeightOnTop => "USTAGR",
                _ => "ISTMEZ",
            };
        }

        if (set >= FragileSetBase) return string.Create(CultureInfo.InvariantCulture, $"KIR{set - FragileSetBase}");

        return string.Create(CultureInfo.InvariantCulture, $"LIFO{set}");
    }

    /// <summary>
    /// Bir kumenin ne olctugu. Uc eksen AYNI ANDA aktif olamaz: her aile tek bir
    /// seyi degistirir, boylece olculen fark yalnizca ondan gelir.
    /// </summary>
    private sealed record Family(string Suite, int Groups, int FragileShare, StackKind Kind, int PerCell);

    private static Family Resolve(int set)
    {
        if (set >= StackSetBase)
            return new Family(Stack, 0, 0, (StackKind)(set - StackSetBase), StackPerCell);

        if (set >= FragileSetBase)
            return new Family(Fragile, 0, set - FragileSetBase, StackKind.None, FragilePerCell);

        if (set > 0)
            return new Family(Lifo, set, 0, StackKind.None, LifoPerCell);

        return new Family(Volume, 0, 0, StackKind.None, VolumePerLevel);
    }

    /// <summary>
    /// Bir kumenin senaryolari. <paramref name="set"/> 0 ise hacim tarafi,
    /// degilse o kadar gruplu LIFO tarafi.
    /// </summary>
    public static IReadOnlyList<BrCorpus.BrInstance> Load(int set, decimal loadRatio, int seed, bool realWeight = false)
    {
        var family = Resolve(set);
        var instances = new List<BrCorpus.BrInstance>(family.PerCell * Levels.Length);

        foreach (var level in Levels)
        {
            for (var n = 0; n < family.PerCell; n++)
            {
                var id = Id(level, family, set, n);
                var instance = Build(id, level, family, loadRatio, Seed(seed, id), realWeight);
                if (instance is not null) instances.Add(instance);
            }
        }

        return instances;
    }

    private static string Id(Level level, Family family, int set, int n)
    {
        if (family.Groups > 0)
            return string.Create(CultureInfo.InvariantCulture, $"lifo-g{family.Groups}-{level.Key}-{n + 1:D3}");

        if (family.FragileShare > 0)
            return string.Create(CultureInfo.InvariantCulture, $"kir-{family.FragileShare}-{level.Key}-{n + 1:D3}");

        if (family.Kind != StackKind.None)
            return string.Create(CultureInfo.InvariantCulture, $"ist-{SetLabel(set).ToLowerInvariant()}-{level.Key}-{n + 1:D3}");

        return string.Create(CultureInfo.InvariantCulture, $"hacim-{level.Key}-{n + 1:D3}");
    }

    /// <summary>
    /// Senaryonun tohumu KIMLIGINDEN turer. Sirali bir sayacla turetilse tek bir
    /// senaryoyu yeniden uretmek icin onundeki her seyi de uretmek gerekirdi;
    /// hata ayiklarken bu bedeli odemeye deger bir sebep yok.
    /// </summary>
    private static uint Seed(int seed, string id)
    {
        var hash = (uint)seed;
        foreach (var c in id) hash = unchecked(hash * 31u + c);

        return hash == 0 ? 1u : hash;
    }

    private static BrCorpus.BrInstance? Build(
        string id, Level level, Family family, decimal loadRatio, uint seed, bool realWeight)
    {
        var groups = family.Groups;
        var fragileShare = family.FragileShare;
        var rng = new GercekCorpus.Lcg(seed);

        var (width, height, length, capacityKg) = GercekCorpus.Vehicle(rng);
        var capacity = width * height * length;
        if (capacity <= 0m) return null;

        var goal = capacity * loadRatio;

        // Tip basina olcu ve adet. Yari yariya: cift sirali tipler gercek
        // ambalaj tablosundan, tek sirali tipler serbest olculu.
        var shapes = new List<Shape>(level.Types);
        var used = 0m;

        for (var t = 0; t < level.Types; t++)
        {
            var real = t % 2 == 0;
            var box = GercekCorpus.Box(rng, real);

            var unit = box.Width * box.Height * box.Length;
            if (unit <= 0m) continue;

            // Kalan hacim kalan tipler arasinda esit paylasilir; son tip artigi alir.
            var slice = (goal - used) / (level.Types - t);
            var quantity = Math.Max(1, (int)(slice / unit));

            shapes.Add(new Shape(box.Width, box.Height, box.Length, box.Weight, quantity, real, StackLimit(family.Kind, rng)));
            used += unit * quantity;
        }

        if (shapes.Count == 0) return null;

        var items = new List<OptimizationItemInput>(shapes.Count * Math.Max(1, groups));
        var boxes = 0;

        // Kirilgan pay BIRIM duzeyinde uygulanir ve artik pay tipler arasinda
        // TASINIR: %5 payda tek bir tipin yuvarlamasi sifira dusse bile toplam
        // oran korunur. Tip duzeyinde atama bunu yapamiyordu (bkz. FragileShares).
        var fragileDebt = 0m;

        // Ucu de bugun ORTOGONALDIR: her aile TEK bir seyi degistirir, boylece
        // olculen fark yalnizca ondan gelir. Birlestirmek ayri bir aile olur ve
        // ayri olculur; sessizce yarim uygulanmasin diye burada acikca duruyor.
        var axes = (groups > 1 ? 1 : 0) + (fragileShare > 0 ? 1 : 0) + (family.Kind != StackKind.None ? 1 : 0);
        if (axes > 1)
        {
            throw new ArgumentException("Suit korpusunda LIFO, kirilganlik ve istif ayni ailede birlesmez.");
        }

        // Istiflenemez pay da BIRIM duzeyinde ve kirilganlikla ayni tasima
        // mantigiyla dagitilir; tip duzeyinde atamanin kirilganlikta yarattigi
        // artefakt (bkz. FragileShares) burada tekrarlanmasin.
        var unstackableDebt = 0m;

        for (var t = 0; t < shapes.Count; t++)
        {
            var shape = shapes[t];
            boxes += shape.Quantity;

            if (groups <= 1)
            {
                var limit = shape.Limit;
                var topWeight = family.Kind == StackKind.WeightOnTop
                    ? Math.Round(shape.Weight * WeightOnTopFactor, 1)
                    : 0m;

                var fragileCount = 0;
                if (fragileShare > 0)
                {
                    var want = (shape.Quantity * fragileShare / 100m) + fragileDebt;
                    fragileCount = Math.Min(shape.Quantity, (int)want);
                    fragileDebt = want - fragileCount;
                }

                var unstackableCount = 0;
                if (family.Kind == StackKind.NotStackable)
                {
                    var want = (shape.Quantity * UnstackableShare / 100m) + unstackableDebt;
                    unstackableCount = Math.Min(shape.Quantity, (int)want);
                    unstackableDebt = want - unstackableCount;
                }

                if (fragileCount > 0)
                {
                    items.Add(Item(id, t, null, shape, fragileCount, limit, topWeight, fragile: true));
                }

                if (unstackableCount > 0)
                {
                    items.Add(Item(id, t, null, shape, unstackableCount, limit, topWeight, stackable: false));
                }

                var plain = shape.Quantity - fragileCount - unstackableCount;
                if (plain > 0)
                {
                    items.Add(Item(id, t, null, shape, plain, limit, topWeight));
                }

                continue;
            }

            // Grup TIPIN ICINDEN bolunur: gercek multi-drop'ta bir bosaltma
            // noktasi karisik yuk alir. Artik kalan birimler tipe gore
            // KAYDIRILARAK dagitilir, boylece az adetli tiplerde de gruplar
            // dengeli doluyor ve hicbir grup sistematik olarak bos kalmiyor.
            var share = shape.Quantity / groups;
            var extra = shape.Quantity % groups;

            for (var g = 0; g < groups; g++)
            {
                var quantity = share + (((g - t) % groups + groups) % groups < extra ? 1 : 0);
                if (quantity <= 0) continue;

                items.Add(Item(id, t, g + 1, shape, quantity, limit: 0, topWeight: 0m));
            }
        }

        if (items.Count == 0) return null;

        var input = new OptimizationInput(
            VehicleWidth: width,
            VehicleHeight: height,
            VehicleLength: length,
            // Varsayilan olarak BAGLAYICI DEGIL: agirlik tirda dengeyi
            // ilgilendirir, doluluk kaybettirmemelidir (urun karari,
            // GercekCorpus ile ayni).
            //
            // --real-weight ile gercek kapasite (tabloda 24-25 t) baglanir.
            // Bu bir OLCUM kipidir: R-A07'nin doluluk maliyeti bugune kadar
            // hicbir kosuda olculemedi cunku tavan hicbir zaman baglamadi.
            VehicleMaxWeight: realWeight ? capacityKg : 1_000_000m,
            Items: items,
            Criteria: groups > 1
                ? LoadingPlanOptimizationCriteria.Lifo
                : LoadingPlanOptimizationCriteria.VolumeFirst,
            LoadingType: LoadingType.Rear,
            // Uretim varsayilani: gruplar bitisik yuklenir (R-C19).
            ClusterGroups: groups > 1,
            Modules: null,
            FillFromMaxX: false);

        var label = string.Create(CultureInfo.InvariantCulture, $"{level.Name} · {level.Types} tip");
        var suite = Volume;

        if (groups > 1)
        {
            label += string.Create(CultureInfo.InvariantCulture, $" · {groups} grup");
            suite = Lifo;
        }
        else if (fragileShare > 0)
        {
            label += string.Create(CultureInfo.InvariantCulture, $" · %{fragileShare} kırılgan");
            suite = Fragile;
        }

        return new BrCorpus.BrInstance(id, input, boxes, used / capacity, suite, label);
    }

    /// <summary>
    /// Tek kalem. <paramref name="group"/> null ise urun gruba bagli degildir
    /// (hacim tarafi); doluysa <c>UnloadingOrder</c> ile birlikte yazilir —
    /// ikisi eksik olursa gruplama uretim yolunda hic kurulmaz.
    ///
    /// <c>UnloadingOrder = 1</c> ILK inecek gruptur ve kapiya en yakin tarafa
    /// dusmesi beklenir (docs/COORDINATE_STANDARD.md §2-3).
    /// </summary>
    private static OptimizationItemInput Item(
        string id, int type, int? group, Shape shape, int quantity,
        int limit, decimal topWeight,
        bool fragile = false, bool stackable = true)
    {
        var prefix = shape.Real ? "GR" : "RS";
        var suffix = string.Empty;
        if (fragile) suffix = "-K";
        else if (!stackable) suffix = "-N";
        var code = group is { } g
            ? string.Create(CultureInfo.InvariantCulture, $"{prefix}-{id}-{type + 1:D2}-g{g}{suffix}")
            : string.Create(CultureInfo.InvariantCulture, $"{prefix}-{id}-{type + 1:D2}{suffix}");

        return new OptimizationItemInput(
            ItemId: BenchCatalog.StableId(code),
            SKU: code,
            Name: code,
            Width: shape.W,
            Height: shape.H,
            Length: shape.L,
            Weight: shape.Weight,
            IsStackable: stackable,
            MaxStackCount: limit,
            MaxWeightOnTop: topWeight,
            // Paletli yuk devrilmez; serbest olculu kutuda boyle bir kisit yok.
            AllowedRotations: shape.Real ? AllowedRotations.NoVertical : AllowedRotations.All,
            Quantity: quantity,
            GroupId: group is { } gid ? BenchCatalog.StableId($"{id}-grup-{gid}") : null,
            UnloadingOrder: group,
            StackGroup: null,
            IncompatibleGroups: null,
            FragilityType: fragile ? FragilityType.Fragile : FragilityType.NonFragile);
    }

    /// <summary>
    /// Tipin istif siniri. <see cref="StackKind.Mixed"/>'de sinir TIPTEN degil
    /// URETECTEN gelir; ilk surumde <c>type % n</c> kullaniliyordu ve tek tipli
    /// senaryolarda her zaman ilk degeri — yani en katisini — veriyordu. O bir
    /// dagilim degil YANLILIKTI.
    ///
    /// Dagilim, arastirmanin iddiasini sinayacak bicimde secildi: *"sinir urune
    /// ozgudur ve COGU URUNDE YOKTUR"*. Bu yuzden yarisi sinirsiz, kalani
    /// cogunlukla gevsek. Sayilarin kendisi bir VARSAYIMDIR — ampirik dagilim
    /// yayinlanmis kaynaklarda yok (arastirmanin kendi caveat'i).
    ///
    /// Neden bu onemli: <c>ViolatesStackCount</c> sutundaki HER kutuya bakar,
    /// yani sinir en KATI kutunun siniridir. Dolayisiyla "ortalama daha gevsek"
    /// bir dagilim daha gevsek DAVRANMAZ; sinirin ne kadar SEYREK oldugu belirler.
    /// </summary>
    private static int StackLimit(StackKind kind, GercekCorpus.Lcg rng)
    {
        if (kind == StackKind.FixedTwo) return FixedStackLimit;
        if (kind != StackKind.Mixed) return 0;

        var roll = rng.NextDouble();
        if (roll < 0.50d) return 0;
        if (roll < 0.70d) return 4;
        if (roll < 0.85d) return 3;
        if (roll < 0.95d) return 2;

        return 1;
    }

    /// <summary>Bugunku kiyas ayari: her uruude en fazla iki kutu ustte.</summary>
    private const int FixedStackLimit = 2;

    /// <summary>
    /// Ust agirlik siniri, kutunun KENDI agirliginin kati. Deger bir varsayimdir
    /// (kaynaklarda ampirik dagilim yok); uc kat, ayni urunden uc kutunun ust
    /// uste binebilmesi demektir ve <see cref="FixedStackLimit"/> ile ayni
    /// mertebede kalir, boylece iki eksen kiyaslanabilir.
    /// </summary>
    private const decimal WeightOnTopFactor = 3m;

    /// <summary>Istiflenemez birimlerin payi (yuzde). Kirilganlikta %20 ile ayni.</summary>
    private const int UnstackableShare = 20;
}
