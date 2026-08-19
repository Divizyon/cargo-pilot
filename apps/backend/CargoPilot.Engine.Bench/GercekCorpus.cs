using System.Globalization;
using CargoPilot.Application.Common.Models;
using CargoPilot.Domain.Enums;

namespace CargoPilot.Engine.Bench;

/// <summary>
/// GERCEK DAGILIMDAN uretilmis korpus — ROADEF/EURO 2022 (Renault) verisi.
///
/// Bu korpus gercek INSTANCE'lar degildir; gercek SEKILDIR. Ham
/// <c>input_trucks.csv</c> / <c>input_items.csv</c> elimizde yok, elimizde
/// olculmus dagilim tablolari var (30 instance, 1,3 milyon parca). Senaryolar
/// bu tablolardan orneklenerek uretilir.
///
/// Neden gerekiyor: BR korpusu olctugumuz dunyanin gercek dunyayla ortusmedigi
/// olculdu (notlar/2026-08-20-gercek-veri-ne-soyluyor.md):
///
///   arac hacmi            30,1 m3   ->  95,5 m3   (3,2 kat)
///   ambalaj hacmi medyan  0,25 m3   ->  1,17 m3   (4,7 kat)
///   arac basina urun tipi 3..100    ->  4,0
///
/// ARAC OLCULERI her senaryoda gercek tablodan gelir; kiyas kumelerinin sabit
/// konteyneri yerine gercek dorse dagilimi kullanilir.
///
/// YUK YARI GERCEK YARI RASTGELEDIR. Gercek yarisi ROADEF ambalaj tablosundan
/// orneklenir (paletli, standart modul); rastgele yarisi serbest olculu kutu
/// uretir. Sebep: urun her sey olabilir — palet de gelir, kasa da, boru da.
/// Yalnizca paletli olcmek, kesit doseme sorununu yapay olarak kolaylastirirdi
/// (gercek paletler arac genisligine tam oturuyor, artik %1,6).
/// Tipler adindan ayirt edilir: <c>GR-*</c> gercek, <c>RS-*</c> rastgele.
///
/// AGIRLIK LIMITI BAGLAYICI DEGILDIR (1.000.000 kg). Bilincli bir urun karari:
/// agirlik tirda dengeyi ilgilendirir, doluluk kaybettirmemelidir. Kutu
/// agirliklari yine gercekci tutulur — agirlik merkezi ve denge olcumleri
/// onlara dayanir — ama hicbir kutu agirlik yuzunden disarida kalmaz.
///
/// URETIM DETERMINISTIKTIR (R-C02): tohum verilir, ayni tohum ayni korpusu
/// verir. Rastgelelik <see cref="BenchRng"/> ile degil, basit bir dogrusal
/// uretecle saglanir; amac istatistiksel kalite degil TEKRARLANABILIRLIK.
///
/// DURUSTLUK NOTU: iki alan varsayimdir, olculmemistir.
///   • Yonelim — paletli (gercek) tipler devrilmez, <c>NoVertical</c> alir;
///     rastgele tipler serbesttir, <c>All</c> alir. Gercek veride bu bilgi
///     <c>Forced orientation</c> alanindadir ve ozetlerde yok.
///   • Tip sayisi — gercek ortalama 3,98; burada 2-6 arasi duzgun dagilim,
///     ortalama 4,0. Instance basina gercek dagilim ozetlerde yok.
/// </summary>
public static class GercekCorpus
{
    private const string Folder = "roadef";

    /// <summary>
    /// Bir aracin tasidigi urun tipi sayisi araligi. Duzgun dagilim 2..6
    /// ortalama 4,0 verir; gercek deger 3,98.
    /// </summary>
    private const int MinTypes = 2;
    private const int MaxTypes = 6;

    private sealed record Truck(decimal Width, decimal Height, decimal Length, decimal MaxWeight, long Share);
    private sealed record Package(decimal L, decimal W, decimal H, decimal Weight, long Share);

    private static List<Truck>? _trucks;
    private static List<Package>? _packages;

    /// <summary>
    /// <paramref name="count"/> senaryo uretir. <paramref name="loadRatio"/>
    /// yukun arac hacmine oranidir; 1,0 tam yuk demektir ve orada agirlik da
    /// baglar.
    /// </summary>
    public static IReadOnlyList<BrCorpus.BrInstance> Load(int count, decimal loadRatio, int seed)
    {
        var trucks = _trucks ??= ReadTrucks();
        var packages = _packages ??= ReadPackages();

        var truckTotal = trucks.Sum(t => t.Share);
        var packageTotal = packages.Sum(p => p.Share);

        var instances = new List<BrCorpus.BrInstance>(count);

        for (var i = 0; i < count; i++)
        {
            // Her senaryonun kendi ureteci var: bir senaryoyu tek basina yeniden
            // uretmek (hata ayiklarken) mumkun olsun diye.
            var rng = new Lcg((uint)(seed + i * 7919));

            var truck = Pick(trucks, t => t.Share, truckTotal, rng);
            var capacity = truck.Width * truck.Height * truck.Length;
            var goal = capacity * loadRatio;

            // Duzgun dagilim 2..6 -> ortalama 4,0, gercek ortalamayla (3,98)
            // birebir. Ilk surumde iki duzgun sayinin CARPIMI kullanilmisti ve
            // dagilim asagi kaymisti: medyan 2 cikti, yani senaryolar gercekte
            // olduklarindan daha az cesitliydi.
            var typeCount = MinTypes + (int)(rng.NextDouble() * (MaxTypes - MinTypes + 1));
            typeCount = Math.Clamp(typeCount, MinTypes, MaxTypes);

            var items = new List<OptimizationItemInput>(typeCount);
            var used = 0m;
            var boxes = 0;

            for (var t = 0; t < typeCount; t++)
            {
                // Yari yariya: cift sirali tipler gercek tablodan, tek sirali
                // tipler serbest olculu. Sira sabit oldugu icin oran senaryo
                // basina da yaklasik yarim yarim kalir.
                var fromReal = t % 2 == 0;
                var package = fromReal
                    ? Pick(packages, p => p.Share, packageTotal, rng)
                    : Random(rng);

                var unit = package.W * package.H * package.L;
                if (unit <= 0m) continue;

                // Kalan hacim tipler arasinda esit paylasilir; son tip artigi alir.
                var slice = (goal - used) / (typeCount - t);
                var quantity = Math.Max(1, (int)(slice / unit));

                items.Add(Build(i, t, package, quantity, fromReal));
                used += unit * quantity;
                boxes += quantity;
            }

            if (items.Count == 0) continue;

            var input = new OptimizationInput(
                VehicleWidth: truck.Width,
                VehicleHeight: truck.Height,
                VehicleLength: truck.Length,
                // Baglayici DEGIL. Agirlik tirda dengeyi ilgilendirir; doluluk
                // kaybettirmemelidir (urun karari). Aracin gercek kapasitesi
                // yine de tasinir, olcum tarafi isterse kullanir.
                VehicleMaxWeight: 1_000_000m,
                Items: items,
                Criteria: LoadingPlanOptimizationCriteria.VolumeFirst,
                LoadingType: LoadingType.Rear,
                ClusterGroups: false,
                Modules: null,
                FillFromMaxX: false);

            instances.Add(new BrCorpus.BrInstance(
                string.Create(CultureInfo.InvariantCulture, $"gercek-{i + 1:D3}"),
                input,
                boxes,
                used / capacity));
        }

        return instances;
    }

    /// <summary>
    /// Serbest olculu kutu. Kenarlar 20-130 cm arasinda; gercek ambalajlarin
    /// alt sinirindan biraz asagi, ust sinirindan biraz yukari, yani paletli
    /// yukun DISINDA kalan her seyi (kasa, boru, kucuk koli) temsil eder.
    ///
    /// Yogunluk gercek yukun olculen ortalamasina (229 kg/m3) yakin tutulur;
    /// agirlik baglayici olmasa da denge olcumleri gercekci kalsin diye.
    /// </summary>
    private static Package Random(Lcg rng)
    {
        decimal Side() => 20m + Math.Round((decimal)rng.NextDouble() * 110m);

        var l = Side();
        var w = Side();
        var h = Side();

        return new Package(l, w, h, Math.Round(l * w * h / 1_000_000m * 229m, 1), 0);
    }

    private static OptimizationItemInput Build(
        int instance, int type, Package package, int quantity, bool fromReal)
    {
        var code = string.Create(CultureInfo.InvariantCulture,
            $"{(fromReal ? "GR" : "RS")}-{instance + 1:D3}-{type + 1:D2}");

        return new OptimizationItemInput(
            ItemId: BenchCatalog.StableId(code),
            SKU: code,
            Name: code,
            // Dosya sirasi uzunluk, genislik, yukseklik; sahne sozlesmesinde
            // x = genislik, y = yukseklik, z = uzunluk.
            Width: package.W,
            Height: package.H,
            Length: package.L,
            Weight: package.Weight,
            IsStackable: true,
            MaxStackCount: 0,
            MaxWeightOnTop: 0m,
            // Paletli yuk devrilmez: yukseklik sabit, yatay cift serbest.
            // Serbest olculu kutuda boyle bir kisit yok.
            AllowedRotations: fromReal ? AllowedRotations.NoVertical : AllowedRotations.All,
            Quantity: quantity,
            GroupId: null,
            UnloadingOrder: null,
            StackGroup: null,
            IncompatibleGroups: null,
            FragilityType: FragilityType.NonFragile);
    }

    private static T Pick<T>(List<T> rows, Func<T, long> weight, long total, Lcg rng)
    {
        var target = (long)(rng.NextDouble() * total);
        var acc = 0L;

        foreach (var row in rows)
        {
            acc += weight(row);
            if (acc > target) return row;
        }

        return rows[^1];
    }

    private static List<Truck> ReadTrucks()
        => [.. Rows("kamyon_tipleri.csv").Select(c => new Truck(
            Width: Mm(c[1]), Height: Mm(c[2]), Length: Mm(c[0]),
            MaxWeight: decimal.Parse(c[3], CultureInfo.InvariantCulture),
            Share: long.Parse(c[5], CultureInfo.InvariantCulture)))];

    private static List<Package> ReadPackages()
        => [.. Rows("ambalaj_olculeri.csv").Select(c => new Package(
            L: Mm(c[0]), W: Mm(c[1]), H: Mm(c[2]),
            Share: long.Parse(c[3], CultureInfo.InvariantCulture),
            Weight: decimal.Parse(c[4], CultureInfo.InvariantCulture)))];

    /// <summary>Milimetre -> santimetre. Sahne sozlesmesi santimetredir.</summary>
    private static decimal Mm(string value)
        => Math.Round(decimal.Parse(value, CultureInfo.InvariantCulture) / 10m);

    private static IEnumerable<string[]> Rows(string file)
    {
        var path = Path.Combine(AppContext.BaseDirectory, "data", Folder, file);
        if (!File.Exists(path)) throw new FileNotFoundException($"Dagilim dosyasi yok: {path}", path);

        return File.ReadLines(path).Skip(1)
            .Where(line => !string.IsNullOrWhiteSpace(line))
            .Select(line => line.Split(','));
    }

    /// <summary>
    /// Dogrusal eslesik ureteç. Istatistiksel kalite aranmiyor; aranan sey ayni
    /// tohumun ayni korpusu vermesi (R-C02).
    /// </summary>
    private sealed class Lcg(uint seed)
    {
        private uint _state = seed == 0 ? 1u : seed;

        internal double NextDouble()
        {
            _state = unchecked(_state * 1664525u + 1013904223u);
            return _state / 4294967296d;
        }
    }
}
