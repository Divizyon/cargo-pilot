using System.Globalization;
using System.Text.Json.Serialization;
using CargoPilot.Application.Common.Models;
using CargoPilot.Domain.Enums;

namespace CargoPilot.Engine.Tests.Golden;

/// <summary>
/// Bir senaryonun diske yazılan tam görüntüsü: girdi + çıktı.
/// Girdi de saklanır, böylece bir snapshot farkının senaryo verisi mi yoksa
/// motor davranışı mı değiştiği için oluştuğu ayırt edilebilir.
/// </summary>
internal sealed record SnapshotPayload(
    string Scenario,
    SnapshotVehicle Vehicle,
    IReadOnlyList<SnapshotItem> Items,
    SnapshotOutcome Outcome)
{
    public static SnapshotPayload From(string scenario, OptimizationInput input, OptimizationResult result)
        => new(
            scenario,
            SnapshotVehicle.From(input),
            input.Items.Select(SnapshotItem.From).ToList(),
            SnapshotOutcome.From(result));
}

/// <remarks>
/// <c>FillFromMaxX</c> kapi listesinden turetilen bir girdidir ve motor yonunu
/// belirler. Snapshot'ta saklanmasaydi aynalanmis yol golden kapsaminin tamamen
/// disinda kalirdi (denetim: S-34).
/// </remarks>
internal sealed record SnapshotVehicle(
    decimal Width,
    decimal Height,
    decimal Length,
    decimal MaxWeight,
    string Criteria,
    string LoadingType,
    bool ClusterGroups,
    bool FillFromMaxX,
    [property: JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingDefault)] string? Sequencer = null,
    [property: JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingDefault)] int Seed = 0)
{
    public static SnapshotVehicle From(OptimizationInput input)
        => new(
            input.VehicleWidth,
            input.VehicleHeight,
            input.VehicleLength,
            input.VehicleMaxWeight,
            input.Criteria.ToString(),
            input.LoadingType.ToString(),
            input.ClusterGroups,
            input.FillsFromMaxX,
            NonDefault(input.Sequencer, SequencerKind.Static),
            input.Seed);

    private static string? NonDefault<T>(T value, T fallback) where T : struct, Enum
        => EqualityComparer<T>.Default.Equals(value, fallback) ? null : value.ToString();
}

internal sealed record SnapshotItem(
    string ItemId,
    string Sku,
    decimal Width,
    decimal Height,
    decimal Length,
    decimal Weight,
    bool IsStackable,
    int MaxStackCount,
    decimal MaxWeightOnTop,
    string AllowedRotations,
    int Quantity,
    string? GroupId,
    int? UnloadingOrder,
    // Kirilganlik 12 Agustos 2026 raporunda "sonraki yenilemede eklensin" diye
    // ertelenmisti. Kozmetik degil: InvariantScenarioSource girdiyi bu kayittan
    // yeniden kuruyor, yani alan olmadan degismez testleri kirilganligi sessizce
    // NonFragile okuyordu.
    string FragilityType = "NonFragile")
{
    public static SnapshotItem From(OptimizationItemInput item)
        => new(
            SnapshotFormat.Id(item.ItemId),
            item.SKU,
            item.Width,
            item.Height,
            item.Length,
            item.Weight,
            item.IsStackable,
            item.MaxStackCount,
            item.MaxWeightOnTop,
            item.AllowedRotations.ToString(),
            item.Quantity,
            item.GroupId.HasValue ? SnapshotFormat.Id(item.GroupId.Value) : null,
            item.UnloadingOrder,
            item.FragilityType.ToString());
}

/// <summary>
/// Yerleştirme kaydı. <c>PlacementId</c> bilinçli olarak dışarıda bırakılmıştır:
/// motor her çalıştırmada <c>Guid.NewGuid()</c> üretir, dolayısıyla deterministik
/// değildir. Yerine listedeki sıra numarası (<c>Order</c>) yazılır.
/// </summary>
internal sealed record SnapshotPlacement(
    int Order,
    string ItemId,
    decimal X,
    decimal Y,
    decimal Z,
    decimal Width,
    decimal Height,
    decimal Length,
    string Rotation,
    decimal Weight)
{
    public static SnapshotPlacement From(PlacedItemResult placement, int order)
        => new(
            order,
            SnapshotFormat.Id(placement.ItemId),
            placement.X,
            placement.Y,
            placement.Z,
            placement.Width,
            placement.Height,
            placement.Length,
            placement.Rotation.ToString(),
            placement.Weight);
}

internal sealed record SnapshotUnplaced(string ItemId, int Quantity, string Reason)
{
    public static SnapshotUnplaced From(UnplacedItemResult unplaced)
        => new(SnapshotFormat.Id(unplaced.ItemId), unplaced.Quantity, unplaced.Reason.ToString());
}

internal sealed record SnapshotOutcome(
    decimal TotalWeight,
    decimal FillRate,
    decimal? CenterOfGravityX,
    decimal? CenterOfGravityY,
    decimal? CenterOfGravityZ,
    decimal? WeightBalanceOffsetX,
    decimal? WeightBalanceOffsetZ,
    IReadOnlyList<SnapshotPlacement> Placements,
    IReadOnlyList<SnapshotUnplaced> UnplacedItems,
    [property: JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingDefault)] SnapshotSearchStats? SearchStats = null)
{
    public static SnapshotOutcome From(OptimizationResult result)
        => new(
            result.TotalWeight,
            result.FillRate,
            result.CenterOfGravityX,
            result.CenterOfGravityY,
            result.CenterOfGravityZ,
            result.WeightBalanceOffsetX,
            result.WeightBalanceOffsetZ,
            result.Placements.Select((placement, index) => SnapshotPlacement.From(placement, index)).ToList(),
            result.UnplacedItems.Select(SnapshotUnplaced.From).ToList(),
            SnapshotSearchStats.From(result.SearchStats));
}

/// <remarks>
/// Sure ve <c>BestCostHistory</c> bilincli olarak disaridadir: ilki her kosuda
/// farklidir, ikincisi katsayi kalibrasyonuyla birlikte kayar ve golden korpusu
/// gereksiz yere kirmizi yakar (ALGORITMA-YOL-HARITASI.md RK-19).
/// </remarks>
internal sealed record SnapshotSearchStats(int Iterations, int Evaluations, bool SearchImproved)
{
    public static SnapshotSearchStats? From(SearchStats? stats)
        => stats is null ? null : new(stats.Iterations, stats.Evaluations, stats.SearchImproved);
}

internal static class SnapshotFormat
{
    public static string Id(Guid value) => value.ToString("D", CultureInfo.InvariantCulture);
}
