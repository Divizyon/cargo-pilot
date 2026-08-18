using System.Globalization;
using CargoPilot.Application.Common.Models;
using CargoPilot.Domain.Enums;

namespace CargoPilot.Engine.Bench;

/// <summary>
/// Bischoff &amp; Ratcliff (1995) BR1-BR7 kiyas kumeleri, OR-Library
/// <c>br0..15.txt</c> dosyalarindan; varsayilan kosu BR1-BR7 (DR-50).
///
/// Neden gerekli: giyotin korpusu %100 ulasilabilir doluluk sunuyor ama
/// olculen sey yalnizca kendi uretecimize gore kalite. Literaturle
/// kiyaslanamiyor ve daha kotusu, <see cref="CorpusDiagnostics"/> olcumu
/// gosterdi ki orada ortalama adet 1,0 — her kutu benzersiz. Kule insasi,
/// blok insasi ve tekrarli desen gibi tekniklerin tamami ayni olcudeki kutu
/// coklugua dayandigi icin o korpusta hicbiri ateslenemiyor.
///
/// BR kumeleri heterojenlik merdivenidir: BR1 uc kutu tipi (zayif heterojen,
/// tekrar bol), BR7 yirmi tip (guclu heterojen). Ayni algoritmanin merdivenin
/// iki ucunda nasil davrandigi tek basina bir teshis.
///
/// Konteyner tum kumelerde 587 x 233 x 220 cm'dir ve toplam kutu hacmi
/// konteynerin biraz altindadir; yani doluluk dogrudan raporlanabilir bir
/// yuzdedir.
/// </summary>
public static class BrCorpus
{
    public sealed record BrInstance(string Id, OptimizationInput Input, int BoxCount, decimal BoxVolumeRatio);

    public static IReadOnlyList<BrInstance> Load(int set)
    {
        var path = Path.Combine(AppContext.BaseDirectory, "data", $"br{set}.txt");
        if (!File.Exists(path)) throw new FileNotFoundException($"BR veri dosyasi yok: {path}", path);

        var tokens = File.ReadAllText(path)
            .Split((char[]?)null, StringSplitOptions.RemoveEmptyEntries);

        var cursor = 0;
        var instanceCount = NextInt(tokens, ref cursor);
        var instances = new List<BrInstance>(instanceCount);

        for (var i = 0; i < instanceCount; i++)
        {
            instances.Add(ReadInstance(tokens, ref cursor, set));
        }

        return instances;
    }

    private static BrInstance ReadInstance(string[] tokens, ref int cursor, int set)
    {
        var number = NextInt(tokens, ref cursor);
        _ = NextInt(tokens, ref cursor); // uretec tohumu; yeniden uretim icin, bize gerekmiyor

        // Dosya sirasi uzunluk, genislik, yukseklik.
        var length = NextInt(tokens, ref cursor);
        var width = NextInt(tokens, ref cursor);
        var height = NextInt(tokens, ref cursor);

        var typeCount = NextInt(tokens, ref cursor);
        var items = new List<OptimizationItemInput>(typeCount);
        var boxes = 0;
        var boxVolume = 0m;

        for (var t = 0; t < typeCount; t++)
        {
            _ = NextInt(tokens, ref cursor); // tip numarasi; kodu asagida biz uretiyoruz

            var d1 = NextInt(tokens, ref cursor);
            var v1 = NextInt(tokens, ref cursor);
            var d2 = NextInt(tokens, ref cursor);
            var v2 = NextInt(tokens, ref cursor);
            var d3 = NextInt(tokens, ref cursor);
            var v3 = NextInt(tokens, ref cursor);
            var quantity = NextInt(tokens, ref cursor);

            var code = string.Create(CultureInfo.InvariantCulture, $"BR{set}-{number:D3}-{t:D2}");
            items.Add(BuildItem(code, d1, v1, d2, v2, d3, v3, quantity));

            boxes += quantity;
            boxVolume += (decimal)d1 * d2 * d3 * quantity;
        }

        var input = new OptimizationInput(
            VehicleWidth: width,
            VehicleHeight: height,
            VehicleLength: length,
            // BR'de agirlik yok. Limit hicbir zaman baglayici olmasin diye bol
            // tutuluyor; aksi halde olculen sey hacim degil agirlik olurdu.
            VehicleMaxWeight: 1_000_000m,
            Items: items,
            Criteria: LoadingPlanOptimizationCriteria.VolumeFirst,
            LoadingType: LoadingType.Rear,
            ClusterGroups: false,
            Modules: null,
            FillFromMaxX: false);

        return new BrInstance(
            string.Create(CultureInfo.InvariantCulture, $"br{set}-{number:D3}"),
            input,
            boxes,
            boxVolume / ((decimal)width * height * length));
    }

    /// <summary>
    /// Yonelim esleme. Bayrak duzenleri veride yalnizca uc bicimde geliyor
    /// (001, 011, 111) ve ikisi birebir karsilaniyor:
    ///
    ///   111 → <see cref="AllowedRotations.All"/>. Birebir.
    ///   001 → <see cref="AllowedRotations.NoVertical"/>, dikey olcu yukseklige
    ///         konur. Birebir: yukseklik sabit, yatay cift serbestce donebilir.
    ///   011 → <see cref="AllowedRotations.NoVerticalWidth"/>. Birebir: dikey
    ///         duramayan olcu W'ye konur, kalan ikisi hem dikeye gelebilir hem
    ///         yatay cifti serbestce dondurebilir. Dort yonelim.
    ///
    /// Uc duzen de artik birebir karsilaniyor (`DR-42`). Onceki esleme 011'i
    /// <c>PitchOnly</c>'ye dusuruyordu ve dort yonelimin yalnizca ikisini
    /// veriyordu; veride 011 duzeni tiplerin ucte birinden fazlasini kapsadigi
    /// icin bu, strict sonucunu yapay olarak asagi cekiyordu.
    /// </summary>
    private static OptimizationItemInput BuildItem(
        string code,
        int d1, int v1, int d2, int v2, int d3, int v3,
        int quantity)
    {
        var verticalCount = v1 + v2 + v3;

        var (width, height, length, rotations) = verticalCount switch
        {
            3 => (d2, d3, d1, AllowedRotations.All),

            // Tek olcu dikey durabiliyor: o olcu yukseklik olur, kalan ikisi
            // yatay cifti kurar ve yaw serbest kalir.
            1 when v1 == 1 => (d2, d1, d3, AllowedRotations.NoVertical),
            1 when v2 == 1 => (d1, d2, d3, AllowedRotations.NoVertical),
            1 => (d1, d3, d2, AllowedRotations.NoVertical),

            // Iki olcu dikey durabiliyor: dikey duramayan olcu X eksenine
            // kilitlenir; kalan ikisi PitchOnly ile yukseklik/uzunluk arasinda
            // yer degistirir.
            _ when v1 == 0 => (d1, d2, d3, AllowedRotations.NoVerticalWidth),
            _ when v2 == 0 => (d2, d1, d3, AllowedRotations.NoVerticalWidth),
            _ => (d3, d1, d2, AllowedRotations.NoVerticalWidth),
        };

        return new OptimizationItemInput(
            ItemId: BenchCatalog.StableId(code),
            SKU: code,
            Name: code,
            Width: width,
            Height: height,
            Length: length,
            Weight: Math.Round((decimal)((long)d1 * d2 * d3) / 1_000_000m, 3),
            IsStackable: true,
            MaxStackCount: 0,
            MaxWeightOnTop: 0m,
            AllowedRotations: rotations,
            Quantity: quantity,
            GroupId: null,
            UnloadingOrder: null,
            StackGroup: null,
            IncompatibleGroups: null,
            FragilityType: FragilityType.NonFragile);
    }

    private static int NextInt(string[] tokens, ref int cursor)
        => int.Parse(tokens[cursor++], CultureInfo.InvariantCulture);
}
