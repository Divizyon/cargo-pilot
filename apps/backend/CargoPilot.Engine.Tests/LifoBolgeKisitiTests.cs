using CargoPilot.Application.Common.Models;
using CargoPilot.Application.Common.Optimization;
using CargoPilot.Domain.Enums;
using CargoPilot.Engine.Tests.Golden;

namespace CargoPilot.Engine.Tests;

/// <summary>
/// LIFO'nun uzaysal kuralını kilitler: her kutu, kendi iniş sırası geldiğinde
/// hâlâ araçta olan hiçbir kutuyu oynatmadan kapıya çıkabilmelidir.
///
/// Kural eskiden BANT'tı — araç uzunluğu gruplara bölünüyor ve her grup kendi
/// bandında kalmaya zorlanıyordu. Ölçüldü ve iki yönden de kötüydü: dar bant
/// kutuları zorunlu taşıtıyor, geniş bant hiç bağlamıyordu. Üstelik bandın
/// kendisi operasyonel gereksinimi ifade etmiyordu — bant içinde kalan bir kutu
/// da pekâlâ başka bir kutunun arkasında sıkışmış olabilir.
///
/// Golden master senaryolarının hepsi tek katmanlı olduğu için katman çatışması
/// orada hiç tetiklenmiyor; bu senaryolar onu bilerek üretir.
///
/// Koordinat sözleşmesi (docs/COORDINATE_STANDARD.md): uzak yüz Z=0,
/// referans kapı Z=VehicleLength.
/// </summary>
public sealed class LifoBolgeKisitiTests
{
    private const LoadingPlanOptimizationCriteria Criteria = LoadingPlanOptimizationCriteria.Lifo;

    private const decimal VehicleWidth = 100m;
    private const decimal VehicleHeight = 200m;
    private const decimal VehicleLength = 200m;

    /// <summary>
    /// P1 — İki grup × 4 kutu (100×50×100). Bölgeler [0,100) ve [100,200);
    /// kutu derinliği bölge boyuna eşittir, yani her kutunun bölge içi geçerli
    /// bir adayı vardır. Yumuşak cezayla motor 8 kutudan 4'ünü yanlış bölgeye
    /// koyuyordu: 100 cm taşma × 2 000 = 200 000, bir kat yükselme ise
    /// 50 cm × 1 000 000 = 50 000 000.
    /// </summary>
    [Fact]
    public void Lifo_CokKatmanli_IkiGrup_HicbirKutuBolgeDisinaTasmaz()
    {
        var items = new List<OptimizationItemInput>
        {
            Box(index: 1, width: 100m, height: 50m, length: 100m, quantity: 4, unloadingOrder: 1),
            Box(index: 2, width: 100m, height: 50m, length: 100m, quantity: 4, unloadingOrder: 2),
        };

        var input = Vehicle(items);
        var result = EngineScenario.Run(input);

        AssertUnloadable(nameof(LifoBolgeKisitiTests), input, result);

        // Kapasite paritesi: sert kısıt kutu kaybettirmemeli.
        Assert.Equal(8, result.Placements.Count);
        Assert.Equal(1m, result.FillRate);
    }

    /// <summary>
    /// P2 — Ayırt edici senaryo: grup1'in ikinci sıra kutusu bölgesini yalnız
    /// 20 cm aşar (20 × 2 000 = 40 000), bölge içi alternatifi ise bir kat
    /// yukarıdadır (50 × 1 000 000). Bölge katsayısını büyütmek bu senaryoyu
    /// çözmez; yalnız iki kademeli seçim çözer.
    /// </summary>
    [Fact]
    public void Lifo_KucukTasma_BolgeIciAdayVarkenTasmaSecilmez()
    {
        var items = new List<OptimizationItemInput>
        {
            Box(index: 1, width: 50m, height: 50m, length: 60m, quantity: 4, unloadingOrder: 1),
            Box(index: 2, width: 50m, height: 50m, length: 100m, quantity: 1, unloadingOrder: 2),
        };

        var input = Vehicle(items);
        var result = EngineScenario.Run(input);

        AssertUnloadable(nameof(LifoBolgeKisitiTests), input, result);

        Assert.Equal(5, result.Placements.Count);
        Assert.Equal(0.2125m, result.FillRate);
    }

    /// <summary>
    /// P3 — Aynalanmis yukleme (big door x = 0, small door z = length): baslangic
    /// kosesi (width, 0, 0), bolge ayrimi yine gecerli.
    ///
    /// Bolge tohumlari x'i sabit 0m ile ekiliyordu; aynalanmis modda aday
    /// <c>ex = 0 - width &lt; 0</c> oldugu icin her yonelimde eleniyordu. Kutu
    /// bolge boyundan kisa oldugunda (3 grup x 40 cm, bolge 100 cm) tohum tek
    /// basina bolgeyi baslatan aday olur; tohumsuz kalinca sonraki grup bir
    /// onceki grubun bittigi yere yigilir ve bolgeler ic ice girer
    /// (denetim: S-04). Motor derleniyor, diger tum testler geciyordu.
    /// </summary>
    [Fact]
    public void Lifo_AynalanmisYukleme_UcGrup_HicbirKutuBolgeDisinaTasmaz()
    {
        var items = new List<OptimizationItemInput>
        {
            Box(index: 1, width: 100m, height: 100m, length: 40m, quantity: 2, unloadingOrder: 1),
            Box(index: 2, width: 100m, height: 100m, length: 40m, quantity: 2, unloadingOrder: 2),
            Box(index: 3, width: 100m, height: 100m, length: 40m, quantity: 2, unloadingOrder: 3),
        };

        var input = Vehicle(items, fillFromMaxX: true, vehicleLength: 300m);
        var result = EngineScenario.Run(input);

        AssertUnloadable(nameof(LifoBolgeKisitiTests), input, result);

        Assert.Equal(6, result.Placements.Count);
    }

    /// <summary>
    /// Ayni senaryonun aynasiz hali: bolge disiplini iki modda da ayni sonucu
    /// vermeli. Ikisi birlikte, duzeltmenin yonu degil yalnizca eksik tohumu
    /// onardigini gosterir.
    /// </summary>
    [Fact]
    public void Lifo_AynasizYukleme_UcGrup_HicbirKutuBolgeDisinaTasmaz()
    {
        var items = new List<OptimizationItemInput>
        {
            Box(index: 1, width: 100m, height: 100m, length: 40m, quantity: 2, unloadingOrder: 1),
            Box(index: 2, width: 100m, height: 100m, length: 40m, quantity: 2, unloadingOrder: 2),
            Box(index: 3, width: 100m, height: 100m, length: 40m, quantity: 2, unloadingOrder: 3),
        };

        var input = Vehicle(items, vehicleLength: 300m);
        var result = EngineScenario.Run(input);

        AssertUnloadable(nameof(LifoBolgeKisitiTests), input, result);

        Assert.Equal(6, result.Placements.Count);
    }

    /// <summary>
    /// Aynalanmis modda yukleme sag duvardan baslar. Arac 200 genis, kutu 100
    /// genis; her bolgede tek kutu oldugu icin dogru davranista tum kutular
    /// x = 100'dedir (kutunun sag kenari duvara dayanir).
    ///
    /// Ayni senaryonun aynasiz hali kardes testte x = 0 bekler; ikisi birlikte
    /// baslangic kosesinin gercekten kapiya gore dondugunu kilitler.
    /// </summary>
    [Fact]
    public void Lifo_AynalanmisYukleme_KutularSagDuvardan_Baslar()
    {
        var input = Vehicle(SingleBoxPerZone(), vehicleWidth: 200m, fillFromMaxX: true);
        var result = EngineScenario.Run(input);

        Assert.Equal(2, result.Placements.Count);
        Assert.All(result.Placements, p => Assert.Equal(100m, p.X));
    }

    /// <summary>Aynasiz karsiligi: yukleme origin kosesinden, x = 0'dan baslar.</summary>
    [Fact]
    public void Lifo_AynasizYukleme_KutularSolDuvardan_Baslar()
    {
        var input = Vehicle(SingleBoxPerZone(), vehicleWidth: 200m);
        var result = EngineScenario.Run(input);

        Assert.Equal(2, result.Placements.Count);
        Assert.All(result.Placements, p => Assert.Equal(0m, p.X));
    }

    private static List<OptimizationItemInput> SingleBoxPerZone()
        => new()
        {
            Box(index: 1, width: 100m, height: 50m, length: 100m, quantity: 1, unloadingOrder: 1),
            Box(index: 2, width: 100m, height: 50m, length: 100m, quantity: 1, unloadingOrder: 2),
        };

    private static OptimizationItemInput Box(
        int index,
        decimal width,
        decimal height,
        decimal length,
        int quantity,
        int unloadingOrder)
        => EngineScenario.Item(
            index,
            width: width,
            height: height,
            length: length,
            weight: 10m,
            quantity: quantity,
            allowedRotations: AllowedRotations.Fixed,
            groupIndex: index,
            unloadingOrder: unloadingOrder);

    private static OptimizationInput Vehicle(
        IReadOnlyList<OptimizationItemInput> items,
        bool fillFromMaxX = false,
        decimal vehicleWidth = VehicleWidth,
        decimal vehicleLength = VehicleLength)
        => EngineScenario.Input(
            items,
            Criteria,
            vehicleWidth: vehicleWidth,
            vehicleHeight: VehicleHeight,
            vehicleLength: vehicleLength,
            loadingType: LoadingType.Rear,
            clusterGroups: true,
            fillFromMaxX: fillFromMaxX);

    /// <summary>
    /// Kuralın BAĞLADIĞI senaryo — kütükteki borç buydu.
    ///
    /// Kutular elle yerleştirilir, böylece geometri tesadüfe bırakılmaz: geç
    /// inecek grup (sıra 2) aracın kapı tarafındaki iki dilimini tamamen
    /// kapatır ve geriye yalnızca UZAK YÜZDE bir cep kalır.
    ///
    /// Erken inecek grubun (sıra 1) kutusu o cebe geometrik olarak sığar ama
    /// oraya konursa sahada çıkarılamaz: önünde iki kutu vardır ve ikisi de
    /// daha sonra inecektir. Kural bu adayı reddetmelidir.
    ///
    /// LIFO kapalıyken aynı kutu cebe yerleşir; farkın kaynağı yalnızca kuraldır.
    /// </summary>
    [Fact]
    public void Lifo_OnuKapaliCep_ErkenInecekKutuyuAlmaz()
    {
        var (input, fixedPlacements) = OnuKapaliCepSenaryosu(LoadingPlanOptimizationCriteria.Lifo);

        var result = new OptimizationEngine().RunIncremental(input, fixedPlacements);
        var pocket = result.Placements.Where(p => p.ItemId == EngineScenario.ItemId(2)).ToList();

        Assert.True(pocket.Count == 0,
            $"Önü kapalı cebe erken inecek kutu konuldu: {string.Join(", ", pocket.Select(p => $"({p.X},{p.Y},{p.Z})"))}");

        PhysicalInvariants.AssertAll(nameof(Lifo_OnuKapaliCep_ErkenInecekKutuyuAlmaz), input, result);
    }

    /// <summary>
    /// Aynı geometri, LIFO kapalı: kutu cebe yerleşir. Kuralın gözlenebilir bir
    /// etkisi olduğunu kilitler — üstteki test tek başına "hiç yerleşmedi" ile
    /// de geçerdi.
    /// </summary>
    [Fact]
    public void LifoKapali_OnuKapaliCep_KutuyuAlir()
    {
        var (input, fixedPlacements) = OnuKapaliCepSenaryosu(LoadingPlanOptimizationCriteria.VolumeFirst);

        var result = new OptimizationEngine().RunIncremental(input, fixedPlacements);

        Assert.Contains(result.Placements, p => p.ItemId == EngineScenario.ItemId(2));
    }

    /// <summary>
    /// Araç 100 × 100 × 300. Sıra 2'nin iki kutusu z = 100..200 ve 200..300'ü
    /// tam kesitle kapatır; geriye z = 0..100 cebi kalır. Sıra 1'in kutusu tam
    /// o cebe sığar.
    /// </summary>
    private static (OptimizationInput Input, List<FixedPlacement> Fixed) OnuKapaliCepSenaryosu(
        LoadingPlanOptimizationCriteria criteria)
    {
        var items = new List<OptimizationItemInput>
        {
            EngineScenario.Item(1, width: 100m, height: 100m, length: 100m, weight: 10m, quantity: 2,
                allowedRotations: AllowedRotations.Fixed, groupIndex: 2, unloadingOrder: 2),
            EngineScenario.Item(2, width: 100m, height: 100m, length: 100m, weight: 10m, quantity: 1,
                allowedRotations: AllowedRotations.Fixed, groupIndex: 1, unloadingOrder: 1),
        };

        var input = EngineScenario.Input(
            items,
            criteria,
            vehicleWidth: 100m,
            vehicleHeight: 100m,
            vehicleLength: 300m,
            vehicleMaxWeight: 10_000m);

        var fixedPlacements = new List<FixedPlacement>
        {
            new(EngineScenario.ItemId(1), X: 0m, Y: 0m, Z: 100m, Rotation: LoadingPlanPlacementRotation.NoRotation),
            new(EngineScenario.ItemId(1), X: 0m, Y: 0m, Z: 200m, Rotation: LoadingPlanPlacementRotation.NoRotation),
        };

        return (input, fixedPlacements);
    }

    /// <summary>
    /// LIFO'nun uzaysal kuralı BANT değil ÇIKARILABİLİRLİKTİR: her kutu, kendi
    /// iniş sırası geldiğinde hâlâ araçta olan hiçbir kutuyu oynatmadan kapıya
    /// çıkabilmelidir. Gruplar uzayda iç içe geçebilir.
    ///
    /// Denetim <see cref="PhysicalInvariants"/>'a devredilir; kural orada
    /// üretim kodundan bağımsız yazılmıştır, dolayısıyla motor kuralı bozarsa
    /// test de birlikte bozulmaz.
    ///
    /// Kapsama güvencesi burada durur: senaryo gerçekten çok gruplu değilse
    /// denetim sessizce geçerdi.
    /// </summary>
    private static void AssertUnloadable(
        string scenario,
        OptimizationInput input,
        OptimizationResult result)
    {
        var orders = result.Placements
            .Select(p => input.Items.First(i => i.ItemId == p.ItemId).UnloadingOrder)
            .Where(o => o.HasValue)
            .Distinct()
            .ToList();

        Assert.True(orders.Count >= 2, "Senaryo çok gruplu değil; LIFO kuralı hiç sınanmıyor.");

        PhysicalInvariants.AssertAll(scenario, input, result);
    }
}
