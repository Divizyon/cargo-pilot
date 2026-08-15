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
/// <param name="ClearanceAtZeroX">
/// <c>x = 0</c> yüzündeki big door'un açıklık payı (x₀, cm). Kapı origin tarafındaysa
/// yükleme <c>(0,0,0)</c>'dan değil <c>(x₀,0,0)</c>'dan başlar
/// (docs/COORDINATE_STANDARD.md §7). Kapı yoksa 0.
/// </param>
/// <param name="ClearanceAtWidthX">
/// <c>x = width</c> yüzündeki big door'un açıklık payı (cm). Kullanılabilir üst sınırı
/// <c>width − x₀</c>'a çeker. Kapı yoksa 0.
/// </param>
/// <param name="ClusterGroups">Gruplu ürünlerin bir arada tutulup tutulmayacağı.</param>
/// <param name="Modules">Modül bayrakları. Verilmezse kriterden türetilir.</param>
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
    decimal ClearanceAtZeroX = 0m,
    decimal ClearanceAtWidthX = 0m)
{
    /// <summary>Yüklemenin başlayabileceği en küçük x (cm).</summary>
    public decimal UsableMinX => ClearanceAtZeroX;

    /// <summary>Yüklemenin taşamayacağı en büyük x (cm).</summary>
    public decimal UsableMaxX => VehicleWidth - ClearanceAtWidthX;
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
