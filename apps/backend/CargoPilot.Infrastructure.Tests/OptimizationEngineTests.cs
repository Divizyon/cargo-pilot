using CargoPilot.Application.Common.Models;
using CargoPilot.Domain.Enums;
using CargoPilot.Infrastructure.Services;
using Xunit;

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
        Assert.InRange(result.CenterOfGravityZ!.Value, 100m, 200m);
    }

    /// <summary>
    /// Lifo + LoadingType.Rear + birden fazla grup senaryosunda bölge cezasının
    /// hâlâ uygulandığını doğrular (regresyon testi). Bu, F0-03 düzeltmesinin
    /// geçerli bölge eşleşmelerini bozmadığını garanti eder.
    ///
    /// ComputeGroupZones distinct UnloadingOrder değerlerini DESC sıralar; bu
    /// dalda (F0-01 kapı yönü düzeltmesinden önce) en yüksek UnloadingOrder
    /// değeri kapıya (Z=0) en yakın bölgeye düşer.
    ///
    /// Araç genişliği kutu genişliğiyle birebir (tek sıra) seçilir: bu dalda
    /// LIFO bölge başlangıçları henüz aday nokta olarak tohumlanmıyor (bkz.
    /// F0-01), yani bir bölgeye yalnızca önceki kutuların ürettiği aday
    /// noktalarla ulaşılabilir. Grup 2 kendi bölge derinliğini (2 kutu) tam
    /// doldurur; böylece aday nokta cephesi grup 1'in bölgesine ilerler ve
    /// grup 1'in tek kutusu kendi bölgesi içine düşer.
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

        // UnloadingOrder=1 (düşük) -> bölge [zoneSize, vehicleLength) -> kapıdan en uzak.
        Assert.True(group1Placement.Z >= zoneSize && group1Placement.Z + group1Placement.Depth <= vehicleLength,
            $"UnloadingOrder=1 bölgesi [{zoneSize},{vehicleLength}] dışında: Z={group1Placement.Z}, derinlik={group1Placement.Depth}");

        foreach (var group2Item in new[] { group2Box1, group2Box2 })
        {
            var placement = Assert.Single(result.Placements, p => p.ItemId == group2Item.ItemId);

            // UnloadingOrder=2 (yüksek) -> bölge [0, zoneSize) -> kapıya en yakın.
            Assert.True(placement.Z >= 0m && placement.Z + placement.Depth <= zoneSize,
                $"UnloadingOrder=2 bölgesi [0,{zoneSize}] dışında: Z={placement.Z}, derinlik={placement.Depth}");
        }
    }

    private static OptimizationItemInput CreateItem(decimal weight, int? unloadingOrder, Guid? groupId)
        => new(
            ItemId: Guid.NewGuid(),
            SKU: $"SKU-{Guid.NewGuid():N}",
            Name: "Test Ürünü",
            ImageUrl: null,
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
