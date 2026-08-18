using CargoPilot.Domain.Enums;

namespace CargoPilot.Application.Common.Models;

/// <summary>Motorun tek girdisi: araç ölçüleri, ürünler ve optimizasyon tercihleri.</summary>
/// <param name="VehicleWidth">Araç iç genişliği (cm).</param>
/// <param name="VehicleHeight">Araç iç yüksekliği (cm).</param>
/// <param name="VehicleLength">Araç iç uzunluğu (cm).</param>
/// <param name="VehicleMaxWeight">Araç maksimum yük kapasitesi (kg).</param>
/// <param name="Items">Yerleştirilecek ürünler.</param>
/// <param name="Criteria">Optimizasyon kriteri.</param>
/// <param name="LoadingType">Yükleme kapısı yönü.</param>
/// <param name="ClusterGroups">Gruplu ürünlerin bir arada tutulup tutulmayacağı.</param>
/// <param name="Modules">Modül bayrakları. Verilmezse kriterden türetilir.</param>
/// <param name="FillFromMaxX">
/// Yukleme <c>x = width</c> tarafindan mi baslasin. Kapinin oldugu yuzden yukleme
/// baslamaz (docs/COORDINATE_STANDARD.md §7): big door <c>x = 0</c> yuzundeyse
/// baslangic kosesi <c>(width, 0, 0)</c> olur ve doldurma kapiya dogru ilerler.
/// Verilmezse <see cref="LoadingType"/>'dan turetilir; motor <see cref="FillsFromMaxX"/>
/// okur.
/// </param>
/// <param name="Strategy">
/// Yerlestirici secimi. Varsayilan <see cref="PlacementStrategy.WallBuilder"/>
/// (ALGORITMA-RULEBOOK.md DR-39); greedy kaldirildi.
/// </param>
/// <param name="Sequencer">
/// Kutu sirasini ureten katman. Varsayilan <see cref="SequencerKind.Static"/> ve
/// bu BILINCLIDIR: motoru dogrudan cagiran her yol (golden snapshot'lar,
/// degismez testleri, doluluk kapisi) saf hesap olan statik yolu alir ve ciktisi
/// makineden bagimsiz bayt kararli kalir. Uretim yolu GRASP'i
/// <see cref="Optimization.SequencerSelection"/> uzerinden alir — orada
/// belirtilmemis sequencer GRASP'a cozulur. GRASP'in butcesi duvar saati oldugu
/// icin buraya varsayilan olarak konursa snapshot testleri makineye bagli
/// hale gelirdi.
/// </param>
/// <param name="SearchBudget">
/// Aramanin iterasyon/populasyon/sure butcesi. Verilmezse
/// <see cref="Models.SearchBudget.Default"/> gecerlidir. Static sequencer'da
/// kullanilmaz.
/// </param>
/// <param name="SupportThreshold">
/// Asgari zemin destek orani. Verilmezse <c>0.80</c> gecerlidir — bugunku
/// davranis. Alan bir POLITIKA degeridir, fizik kanunu degil (DR-16); bugun
/// yalnizca olcum duzenegi doldurur, uretim yollari doldurmaz.
/// </param>
/// <param name="Seed">
/// Aramanin rastgelelik tohumu. Ayni tohum + ayni girdi bit birebir ayni plani
/// uretir (R-C02/DR-06). Static sequencer'da kullanilmaz.
/// </param>
public sealed record OptimizationInput(
    decimal VehicleWidth,
    decimal VehicleHeight,
    decimal VehicleLength,
    decimal VehicleMaxWeight,
    IReadOnlyList<OptimizationItemInput> Items,
    LoadingPlanOptimizationCriteria Criteria = LoadingPlanOptimizationCriteria.VolumeFirst,
    LoadingType LoadingType = LoadingType.Rear,
    bool ClusterGroups = true,
    OptimizationModules? Modules = null,
    bool? FillFromMaxX = null,
    PlacementStrategy Strategy = PlacementStrategy.WallBuilder,
    SequencerKind Sequencer = SequencerKind.Static,
    int Seed = 0,
    SearchBudget? SearchBudget = null,
    decimal? SupportThreshold = null)
{
    /// <summary>
    /// Yüklemenin gerçekten <c>x = width</c> tarafından başlayıp başlamadığı.
    /// Kapı listesi verilmediyse tekil alandan türetilir; böylece <c>doors</c>
    /// henüz doldurulmamış çağrı yolları bugünkü davranışı korur.
    /// </summary>
    public bool FillsFromMaxX => FillFromMaxX ?? (LoadingType == LoadingType.SideLeft);
}

/// <summary>
/// Optimizasyon modüllerinin açık/kapalı durumu. Verilmezse kriterden türetilir
/// ve türetilmiş değerler bugünkü davranışı birebir üretir.
///
/// Bilinçli olarak dışarıya kapalıdır: skor katsayıları yalnızca mevcut üç
/// kriter için kalibre edilmiştir, dört bayrağın ürettiği on altı kombinasyonun
/// çoğu kalibre edilmemiştir. Bu yüzden hiçbir API sözleşmesine (request DTO,
/// komut, validator, Swagger şeması) bağlanmaz; yalnızca motorun içinden ve
/// testlerden kullanılır.
/// </summary>
public sealed record OptimizationModules(
    bool UseVolume,
    bool UseWeightBalance,
    bool UseLifo,
    bool UseContamination)
{
    /// <summary>
    /// Bayrakların kriterden türetilmesi. Her satır bugün kodun ilgili modülü
    /// hangi koşulda çalıştırdığının aynısıdır:
    /// hacim terimleri WeightBalance dışında, denge katsayısı Lifo dışında,
    /// bölge hesabı yalnızca Lifo'da, kontaminasyon filtresi ise her zaman.
    /// </summary>
    internal static OptimizationModules FromCriteria(LoadingPlanOptimizationCriteria criteria)
        => new(
            UseVolume: criteria != LoadingPlanOptimizationCriteria.WeightBalance,
            UseWeightBalance: criteria != LoadingPlanOptimizationCriteria.Lifo,
            UseLifo: criteria == LoadingPlanOptimizationCriteria.Lifo,
            UseContamination: true);

    /// <summary>Girdideki açık bayraklar, yoksa kriterden türetilmiş varsayılanlar.</summary>
    internal static OptimizationModules Resolve(OptimizationInput input)
        => input.Modules ?? FromCriteria(input.Criteria);
}

public sealed record OptimizationItemInput(
    Guid ItemId,
    string SKU,
    string Name,
    decimal Width,
    decimal Height,
    decimal Length,
    decimal Weight,
    bool IsStackable,
    int MaxStackCount,
    decimal MaxWeightOnTop,
    AllowedRotations AllowedRotations,
    int Quantity,
    Guid? GroupId = null,
    int? UnloadingOrder = null,
    string? StackGroup = null,
    IReadOnlyList<string>? IncompatibleGroups = null,
    // Kırılganlık sınıfı. Varsayılan NonFragile bugünkü davranışı birebir korur:
    // alan verilmediğinde hiçbir yeni ret üretilmez
    FragilityType FragilityType = FragilityType.NonFragile);
