using System.Globalization;
using CargoPilot.Application.Common.Models;
using CargoPilot.Application.Common.Optimization;
using CargoPilot.Domain.Enums;

namespace CargoPilot.Engine.Tests.Golden;

/// <summary>
/// Senaryo kurucuları. Tüm kimlikler indeks tabanlı sabit Guid'lerdir;
/// <c>Guid.NewGuid()</c> kullanılmaz, aksi hâlde snapshot her koşuda değişirdi.
/// </summary>
internal static class EngineScenario
{
    public const decimal StandardWidth = 200m;
    public const decimal StandardHeight = 200m;
    public const decimal StandardLength = 400m;
    public const decimal StandardMaxWeight = 2_000m;

    /// <summary>Tek kutu genişliğinde, yüksek gövdeli araç; istif kısıtlarını zorlamak için.</summary>
    public const decimal TallWidth = 100m;
    public const decimal TallHeight = 400m;
    public const decimal TallLength = 100m;

    /// <summary>LIFO bölge testleri için dar ve uzun araç.</summary>
    public const decimal CorridorWidth = 100m;
    public const decimal CorridorHeight = 100m;
    public const decimal CorridorLength = 300m;

    public static Guid ItemId(int index) => new($"00000000-0000-0000-0000-{Suffix(index)}");

    public static Guid GroupId(int index) => new($"00000000-0000-0000-0001-{Suffix(index)}");

    public static OptimizationItemInput Item(
        int index,
        decimal width,
        decimal height,
        decimal length,
        decimal weight,
        int quantity = 1,
        bool isStackable = true,
        int maxStackCount = 0,
        decimal maxWeightOnTop = 0m,
        AllowedRotations allowedRotations = AllowedRotations.All,
        int? groupIndex = null,
        int? unloadingOrder = null,
        FragilityType fragilityType = FragilityType.NonFragile)
        => new(
            ItemId: ItemId(index),
            SKU: $"SKU-{Suffix(index)}",
            Name: $"Urun-{Suffix(index)}",
            Width: width,
            Height: height,
            Length: length,
            Weight: weight,
            IsStackable: isStackable,
            MaxStackCount: maxStackCount,
            MaxWeightOnTop: maxWeightOnTop,
            AllowedRotations: allowedRotations,
            Quantity: quantity,
            GroupId: groupIndex.HasValue ? GroupId(groupIndex.Value) : null,
            UnloadingOrder: unloadingOrder,
            FragilityType: fragilityType);

    public static OptimizationInput Input(
        IReadOnlyList<OptimizationItemInput> items,
        LoadingPlanOptimizationCriteria criteria,
        decimal vehicleWidth = StandardWidth,
        decimal vehicleHeight = StandardHeight,
        decimal vehicleLength = StandardLength,
        decimal vehicleMaxWeight = StandardMaxWeight,
        LoadingType loadingType = LoadingType.Rear,
        bool clusterGroups = true,
        bool fillFromMaxX = false,
        PlacementStrategy strategy = PlacementStrategy.Greedy,
        SequencerKind sequencer = SequencerKind.Static,
        int seed = 0)
        => new(
            vehicleWidth,
            vehicleHeight,
            vehicleLength,
            vehicleMaxWeight,
            items,
            criteria,
            loadingType,
            clusterGroups,
            Modules: null,
            FillFromMaxX: fillFromMaxX,
            Strategy: strategy,
            Sequencer: sequencer,
            Seed: seed);

    public static OptimizationResult Run(OptimizationInput input) => new OptimizationEngine().Run(input);

    /// <summary>Senaryoyu çalıştırır ve sonucu adı verilen snapshot ile karşılaştırır.</summary>
    public static void Verify(string scenario, OptimizationInput input)
        => GoldenMaster.Match(scenario, input, Run(input));

    private static string Suffix(int index) => index.ToString("D12", CultureInfo.InvariantCulture);
}
