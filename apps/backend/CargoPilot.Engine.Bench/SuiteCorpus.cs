using System.Globalization;
using CargoPilot.Application.Common.Models;
using CargoPilot.Domain.Enums;

namespace CargoPilot.Engine.Bench;

/// <summary>
/// BUYUK SUIT — 600 hacim + 600 LIFO senaryosu, tek koşuda.
///
/// Neden ayri bir korpus: <see cref="GercekCorpus"/> yuz senaryo uretiyor ve
/// LIFO'yu <see cref="ConstraintCorpus"/> uzerinden SONRADAN yaziyor. O yol
/// grubu urun TIPINE bagliyor — her tip bir gruba dusuyor — ve gercek
/// multi-drop oyle degildir: bir bosaltma noktasi karisik yuk alir. Suit
/// gruplari tiplerin ICINDEN boler, yani ayni urun birden fazla gruba dagilir.
///
/// Iki eksende tarar:
///
///   HETEROJENLIK  tip sayisi — BR merdiveninin ayni ekseni (BR1 uc tip,
///                 BR7 yirmi tip). Dort kademe: ayni / az farkli / cok farkli /
///                 tamamen farkli.
///   GRUP SAYISI   yalniz LIFO tarafinda: 2, 3, 4, 5, 6 bosaltma noktasi.
///
///   hacim  = 4 kademe x 150 senaryo                       =  600
///   lifo   = 5 grup sayisi x 4 kademe x 30 senaryo        =  600
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

    /// <summary>Kirilganlik tarafinda pay x kademe basina senaryo.</summary>
    private const int FragilePerCell = 30;

    /// <summary>Kirilganlik kume numaralarinin tasindigi taban.</summary>
    private const int FragileSetBase = 100;

    /// <summary>Suit kimlikleri; gorunumdeki sekmeler bunlardan turer.</summary>
    internal const string Volume = "hacim";
    internal const string Lifo = "lifo";
    internal const string Fragile = "kirilganlik";

    /// <summary>
    /// Kume numarasi: 0 = hacim · 2..6 = o kadar gruplu LIFO · 100 + pay =
    /// kirilganlik. Grup sayisinin ve payin kume numarasina gomulmesi bilincli —
    /// tabloya bakan kisi ek bir esleme tablosuna ihtiyac duymasin.
    /// </summary>
    internal static IReadOnlyList<int> Sets =>
        [0, .. GroupCounts, .. FragileShares.Select(share => FragileSetBase + share)];

    internal static string SetLabel(int set)
    {
        if (set == 0) return "HACIM";
        if (set >= FragileSetBase) return string.Create(CultureInfo.InvariantCulture, $"KIR{set - FragileSetBase}");

        return string.Create(CultureInfo.InvariantCulture, $"LIFO{set}");
    }

    /// <summary>
    /// Bir kumenin senaryolari. <paramref name="set"/> 0 ise hacim tarafi,
    /// degilse o kadar gruplu LIFO tarafi.
    /// </summary>
    public static IReadOnlyList<BrCorpus.BrInstance> Load(int set, decimal loadRatio, int seed, bool realWeight = false)
    {
        var fragileShare = set >= FragileSetBase ? set - FragileSetBase : 0;
        var groups = set > 0 && set < FragileSetBase ? set : 0;

        var perCell = VolumePerLevel;
        if (groups > 0) perCell = LifoPerCell;
        else if (fragileShare > 0) perCell = FragilePerCell;

        var instances = new List<BrCorpus.BrInstance>(perCell * Levels.Length);

        foreach (var level in Levels)
        {
            for (var n = 0; n < perCell; n++)
            {
                var id = Id(level, groups, fragileShare, n);
                var instance = Build(id, level, groups, fragileShare, loadRatio, Seed(seed, id), realWeight);
                if (instance is not null) instances.Add(instance);
            }
        }

        return instances;
    }

    private static string Id(Level level, int groups, int fragileShare, int n)
    {
        if (groups > 0)
            return string.Create(CultureInfo.InvariantCulture, $"lifo-g{groups}-{level.Key}-{n + 1:D3}");

        if (fragileShare > 0)
            return string.Create(CultureInfo.InvariantCulture, $"kir-{fragileShare}-{level.Key}-{n + 1:D3}");

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
        string id, Level level, int groups, int fragileShare, decimal loadRatio, uint seed, bool realWeight)
    {
        var rng = new GercekCorpus.Lcg(seed);

        var (width, height, length, capacityKg) = GercekCorpus.Vehicle(rng);
        var capacity = width * height * length;
        if (capacity <= 0m) return null;

        var goal = capacity * loadRatio;

        // Tip basina olcu ve adet. Yari yariya: cift sirali tipler gercek
        // ambalaj tablosundan, tek sirali tipler serbest olculu.
        var shapes = new List<(decimal W, decimal H, decimal L, decimal Weight, int Quantity, bool Real)>(level.Types);
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

            shapes.Add((box.Width, box.Height, box.Length, box.Weight, quantity, real));
            used += unit * quantity;
        }

        if (shapes.Count == 0) return null;

        var items = new List<OptimizationItemInput>(shapes.Count * Math.Max(1, groups));
        var boxes = 0;

        // Kirilgan pay BIRIM duzeyinde uygulanir ve artik pay tipler arasinda
        // TASINIR: %5 payda tek bir tipin yuvarlamasi sifira dusse bile toplam
        // oran korunur. Tip duzeyinde atama bunu yapamiyordu (bkz. FragileShares).
        var fragileDebt = 0m;

        // Iki eksen bugun ORTOGONALDIR: LIFO ailesinde kirilgan yok, kirilganlik
        // ailesinde grup yok. Birlestirmek ayri bir aile olur ve ayri olculur;
        // sessizce yarim uygulanmasin diye burada acikca duruyor.
        if (groups > 1 && fragileShare > 0)
        {
            throw new ArgumentException("Suit korpusunda LIFO ve kirilganlik ayni ailede birlesmez.");
        }

        for (var t = 0; t < shapes.Count; t++)
        {
            var shape = shapes[t];
            boxes += shape.Quantity;

            if (groups <= 1)
            {
                var fragileCount = 0;
                if (fragileShare > 0)
                {
                    var want = (shape.Quantity * fragileShare / 100m) + fragileDebt;
                    fragileCount = Math.Min(shape.Quantity, (int)want);
                    fragileDebt = want - fragileCount;
                }

                if (fragileCount > 0)
                {
                    items.Add(Item(id, t, group: null, shape.W, shape.H, shape.L, shape.Weight, fragileCount, shape.Real, fragile: true));
                }

                var plain = shape.Quantity - fragileCount;
                if (plain > 0)
                {
                    items.Add(Item(id, t, group: null, shape.W, shape.H, shape.L, shape.Weight, plain, shape.Real));
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

                items.Add(Item(id, t, g + 1, shape.W, shape.H, shape.L, shape.Weight, quantity, shape.Real));
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
        string id, int type, int? group,
        decimal width, decimal height, decimal length, decimal weight, int quantity, bool real,
        bool fragile = false)
    {
        var prefix = real ? "GR" : "RS";
        var suffix = fragile ? "-K" : string.Empty;
        var code = group is { } g
            ? string.Create(CultureInfo.InvariantCulture, $"{prefix}-{id}-{type + 1:D2}-g{g}{suffix}")
            : string.Create(CultureInfo.InvariantCulture, $"{prefix}-{id}-{type + 1:D2}{suffix}");

        return new OptimizationItemInput(
            ItemId: BenchCatalog.StableId(code),
            SKU: code,
            Name: code,
            Width: width,
            Height: height,
            Length: length,
            Weight: weight,
            IsStackable: true,
            MaxStackCount: 0,
            MaxWeightOnTop: 0m,
            // Paletli yuk devrilmez; serbest olculu kutuda boyle bir kisit yok.
            AllowedRotations: real ? AllowedRotations.NoVertical : AllowedRotations.All,
            Quantity: quantity,
            GroupId: group is { } gid ? BenchCatalog.StableId($"{id}-grup-{gid}") : null,
            UnloadingOrder: group,
            StackGroup: null,
            IncompatibleGroups: null,
            FragilityType: fragile ? FragilityType.Fragile : FragilityType.NonFragile);
    }
}
