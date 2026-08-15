using System.Text.Json;
using CargoPilot.Application.Common.Models;
using CargoPilot.Domain.Enums;

namespace CargoPilot.Engine.Tests.Golden;

/// <summary>
/// Değişmez testlerinin senaryo katalogu. Golden-master senaryoları kopyalanmaz:
/// <c>Snapshots/*.json</c> dosyaları girdiyi de sakladığı için (bkz.
/// <see cref="SnapshotPayload"/>) katalog doğrudan o dosyalardan okunur ve girdi
/// yeniden kurulur. Böylece yeni bir golden senaryo eklendiğinde değişmez
/// testleri onu kendiliğinden kapsar.
///
/// Katalog ayrıca 500 kutuluk performans senaryosunu da üretir; o senaryonun
/// snapshot'ı yoktur ve kurucusu <c>PerformansTabanCizgisiTests</c> içinde
/// private olduğu için burada aynı deterministik türetmeyle yeniden kurulur.
/// </summary>
internal static class InvariantScenarioSource
{
    private const string ProjectFileName = "CargoPilot.Engine.Tests.csproj";
    private const string SnapshotFolderName = "Snapshots";

    /// <summary>Snapshot'ı olmayan, kod içinde üretilen büyük senaryoların ön eki.</summary>
    private const string LargeScenarioPrefix = "Buyuk500_";

    /// <summary>PerformansTabanCizgisiTests ile aynı kutu ve tip sayısı.</summary>
    private const int LargeBoxCount = 500;
    private const int LargeTypeCount = 10;

    private static readonly Lazy<string> SnapshotDirectory = new(ResolveSnapshotDirectory);

    /// <summary>Tüm senaryo adları: diskteki golden senaryolar + büyük senaryolar.</summary>
    public static IReadOnlyList<string> Names()
        => GoldenNames().Concat(LargeNames()).ToList();

    /// <summary>Senaryo adından motor girdisini kurar.</summary>
    public static OptimizationInput Load(string scenario)
        => scenario.StartsWith(LargeScenarioPrefix, StringComparison.Ordinal)
            ? LargeInput(Enum.Parse<LoadingPlanOptimizationCriteria>(scenario[LargeScenarioPrefix.Length..]))
            : FromSnapshot(scenario);

    private static IEnumerable<string> GoldenNames()
        => Directory.GetFiles(SnapshotDirectory.Value, "*.json")
            .Select(Path.GetFileNameWithoutExtension)
            .OfType<string>()
            .OrderBy(name => name, StringComparer.Ordinal);

    private static IEnumerable<string> LargeNames()
        => new[]
        {
            LoadingPlanOptimizationCriteria.VolumeFirst,
            LoadingPlanOptimizationCriteria.WeightBalance,
            LoadingPlanOptimizationCriteria.Lifo,
        }.Select(criteria => LargeScenarioPrefix + criteria.ToString());

    private static OptimizationInput FromSnapshot(string scenario)
    {
        var path = Path.Combine(SnapshotDirectory.Value, scenario + ".json");
        var payload = JsonSerializer.Deserialize<SnapshotPayload>(File.ReadAllText(path))
            ?? throw new InvalidOperationException($"Snapshot okunamadı: {path}");

        return new OptimizationInput(
            payload.Vehicle.Width,
            payload.Vehicle.Height,
            payload.Vehicle.Length,
            payload.Vehicle.MaxWeight,
            payload.Items.Select(ToItem).ToList(),
            Enum.Parse<LoadingPlanOptimizationCriteria>(payload.Vehicle.Criteria),
            Enum.Parse<LoadingType>(payload.Vehicle.LoadingType),
            payload.Vehicle.ClusterGroups);
    }

    /// <summary>
    /// Snapshot'ta saklanmayan alanlar (Name, ImageUrl, kırılganlık, stackGroup)
    /// motor davranışını bu senaryolarda etkilemez; hepsi varsayılan değerdedir.
    /// </summary>
    private static OptimizationItemInput ToItem(SnapshotItem item)
        => new(
            ItemId: Guid.Parse(item.ItemId),
            SKU: item.Sku,
            Name: item.Sku,
            ImageUrl: null,
            Width: item.Width,
            Height: item.Height,
            Length: item.Length,
            Weight: item.Weight,
            IsStackable: item.IsStackable,
            MaxStackCount: item.MaxStackCount,
            MaxWeightOnTop: item.MaxWeightOnTop,
            AllowedRotations: Enum.Parse<AllowedRotations>(item.AllowedRotations),
            Quantity: item.Quantity,
            GroupId: item.GroupId is null ? null : Guid.Parse(item.GroupId),
            UnloadingOrder: item.UnloadingOrder);

    /// <summary>Deterministik 500 kutuluk girdi; rastgelelik yok, her alan tip indeksinden türetilir.</summary>
    private static OptimizationInput LargeInput(LoadingPlanOptimizationCriteria criteria)
    {
        var items = new List<OptimizationItemInput>(LargeTypeCount);

        for (var i = 0; i < LargeTypeCount; i++)
        {
            items.Add(EngineScenario.Item(
                index: 500 + i,
                width: 40m + (i % 5) * 5m,
                height: 30m + (i % 4) * 5m,
                length: 50m + (i % 3) * 5m,
                weight: 10m + i * 2m,
                quantity: LargeBoxCount / LargeTypeCount,
                allowedRotations: i % 2 == 0 ? AllowedRotations.All : AllowedRotations.NoVertical,
                groupIndex: i % 3,
                unloadingOrder: i % 3 + 1));
        }

        return EngineScenario.Input(
            items,
            criteria,
            vehicleWidth: 240m,
            vehicleHeight: 260m,
            vehicleLength: 1_360m,
            vehicleMaxWeight: 24_000m);
    }

    /// <summary>
    /// Snapshot'lar kaynak ağacında tutulur; proje dizini çalışma anında yukarı
    /// doğru .csproj aranarak bulunur (GoldenMaster ile aynı yöntem).
    /// </summary>
    private static string ResolveSnapshotDirectory()
    {
        var directory = new DirectoryInfo(AppContext.BaseDirectory);

        while (directory is not null)
        {
            if (File.Exists(Path.Combine(directory.FullName, ProjectFileName)))
            {
                return Path.Combine(directory.FullName, SnapshotFolderName);
            }

            directory = directory.Parent;
        }

        throw new InvalidOperationException(
            $"{ProjectFileName} bulunamadı; snapshot klasörü {AppContext.BaseDirectory} üzerinden çözülemedi.");
    }
}
