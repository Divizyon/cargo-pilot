using CargoPilot.Application.Common.Models;
using CargoPilot.Application.Common.Optimization;
using CargoPilot.Domain.Enums;

namespace CargoPilot.Infrastructure.Tests;

/// <summary>
/// OptimizationEngine.cs:52 - bölge eşleşmesi olmayan kutularda fantom ceza
/// düzeltmesini doğrular. Eşleşme olmadığında (TryGetValue false döndüğünde)
/// zoneStart/zoneEnd artık null kalır; eskiden default (0,0) struct değeri
/// kullanılıyordu ve bu, kutuları Z=0'a (kapıya) zorlayan devasa bir ceza
/// üretiyordu.
/// </summary>
public sealed class OptimizationEngineTests
{
    /// <summary>
    /// WeightBalance kriterinde bölge tanımı olmayan (grupsuz) kutularda fantom
    /// ceza uygulanmadığını doğrular. Düzeltme öncesi zonePenalty = (0 + ez + d) *
    /// 2000 şeklinde her kutuyu Z=0'a çekiyordu; bu da ağırlık merkezini araç
    /// uzunluğunun ortasından uzaklaştırıyordu. Düzeltme sonrası dağılım yalnızca
    /// balancePenalty tarafından belirlenir ve ağırlık merkezi araç ortasına
    /// (halfL) yakın kalır.
    /// </summary>
    [Fact]
    public void WeightBalance_NoZoneDefinition_NoPhantomPenalty()
    {
        var items = new List<OptimizationItemInput>
        {
            CreateItem(weight: 200m, unloadingOrder: null, groupId: null)
        };
        for (var i = 0; i < 6; i++)
            items.Add(CreateItem(weight: 50m, unloadingOrder: null, groupId: null));

        var input = new OptimizationInput(
            VehicleWidth: 200m,
            VehicleHeight: 200m,
            VehicleLength: 300m,
            VehicleMaxWeight: 1000m,
            items,
            LoadingPlanOptimizationCriteria.WeightBalance,
            LoadingType.Rear);

        var result = new OptimizationEngine().Run(input);

        Assert.Equal(items.Count, result.Placements.Count);
        Assert.Empty(result.UnplacedItems);

        // Ağırlık merkezi araç uzunluğunun (300) ortasına (150) yakın olmalı.
        // Fantom ceza varken kutular Z=0'a yığılır ve CoG 100'ün altına düşer.
        Assert.NotNull(result.CenterOfGravityZ);
        Assert.InRange(result.CenterOfGravityZ.Value, 100m, 200m);
    }

    /// <summary>
    /// Lifo + LoadingType.Rear + birden fazla grup senaryosunda bölge cezasının
    /// hâlâ uygulandığını doğrular (regresyon testi). Bu, F0-03 düzeltmesinin
    /// geçerli bölge eşleşmelerini bozmadığını garanti eder.
    ///
    /// Kasıtlı olarak yöne bağımsızdır: hangi grubun kapıya (Z=0) yakın bölgeye
    /// düştüğü F0-01'in sorumluluğudur ve orada (GroupZoneTests) doğrulanır.
    /// Burada yalnızca her grubun kendi UnloadingOrder'ına ait, zoneSize
    /// genişliğindeki dilime toplandığı ve iki grubun farklı, çakışmayan
    /// dilimlere düştüğü doğrulanır.
    /// </summary>
    [Fact]
    public void Lifo_MultipleGroups_ZonePenaltyApplied()
    {
        const decimal vehicleLength = 200m;
        const decimal zoneSize = vehicleLength / 2m;

        var group2Box1 = CreateItem(weight: 50m, unloadingOrder: 2, groupId: Guid.NewGuid());
        var group2Box2 = CreateItem(weight: 50m, unloadingOrder: 2, groupId: group2Box1.GroupId);
        var group1Box = CreateItem(weight: 50m, unloadingOrder: 1, groupId: Guid.NewGuid());
        var ungrouped = CreateItem(weight: 50m, unloadingOrder: null, groupId: null);

        var items = new List<OptimizationItemInput> { group2Box1, group2Box2, group1Box, ungrouped };

        var input = new OptimizationInput(
            VehicleWidth: 50m,
            VehicleHeight: 50m,
            VehicleLength: vehicleLength,
            VehicleMaxWeight: 500m,
            items,
            LoadingPlanOptimizationCriteria.Lifo,
            LoadingType.Rear);

        var result = new OptimizationEngine().Run(input);

        Assert.Equal(4, result.Placements.Count);
        Assert.Empty(result.UnplacedItems);

        var group1Placement = Assert.Single(result.Placements, p => p.ItemId == group1Box.ItemId);
        var group2Placements = new[] { group2Box1, group2Box2 }
            .Select(item => Assert.Single(result.Placements, p => p.ItemId == item.ItemId))
            .ToList();

        // Grup 1'in düştüğü bölge dilimi ne olursa olsun (kapıya yakın ya da uzak),
        // tek kutusu o dilimin dışına taşmamalı.
        var group1Zone = ZoneIndex(group1Placement.Z, zoneSize);
        Assert.True(WithinZone(group1Placement, group1Zone, zoneSize),
            $"Grup 1 kutusu kendi bölge dilimi [{group1Zone * zoneSize},{(group1Zone + 1) * zoneSize}] dışında: Z={group1Placement.Z}, derinlik={group1Placement.Depth}");

        foreach (var placement in group2Placements)
        {
            var group2Zone = ZoneIndex(placement.Z, zoneSize);
            Assert.True(WithinZone(placement, group2Zone, zoneSize),
                $"Grup 2 kutusu kendi bölge dilimi [{group2Zone * zoneSize},{(group2Zone + 1) * zoneSize}] dışında: Z={placement.Z}, derinlik={placement.Depth}");

            // İki grup, aynı bölge dilimini paylaşmamalı (bölge cezası ayrıştırıyor).
            Assert.NotEqual(group1Zone, group2Zone);
        }
    }

    private static int ZoneIndex(decimal z, decimal zoneSize) => (int)(z / zoneSize);

    private static bool WithinZone(PlacedItemResult placement, int zoneIndex, decimal zoneSize)
        => placement.Z >= zoneIndex * zoneSize && placement.Z + placement.Depth <= (zoneIndex + 1) * zoneSize;

    private static OptimizationItemInput CreateItem(decimal weight, int? unloadingOrder, Guid? groupId)
        => new(
            ItemId: Guid.NewGuid(),
            SKU: $"SKU-{Guid.NewGuid():N}",
            Name: "Test Ürünü",
            Width: 50m,
            Height: 50m,
            Length: 50m,
            Weight: weight,
            IsStackable: false,
            MaxStackCount: 1,
            MaxWeightOnTop: 0m,
            AllowedRotations: AllowedRotations.Fixed,
            Quantity: 1,
            GroupId: groupId,
            UnloadingOrder: unloadingOrder);
}
