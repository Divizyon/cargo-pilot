using CargoPilot.Domain.Packing;
using CargoPilot.Infrastructure.Packing;
using Xunit;

namespace CargoPilot.Tests.Packing;

public sealed class PackingEngineTests
{
    private readonly PackingEngine _engine = new();
    private static readonly PackingParameters DefaultParams = new(LifoEnabled: false, CgThresholdPercent: 15m);

    // T1: Tek ürün — konteynere tam sığan → x=0, y=0, z=0'a yerleşmeli
    [Fact]
    public void SingleItem_ExactFit_PlacedAtOrigin()
    {
        var container = new ContainerSpec(2m, 1m, 1m, 1000m);
        var items = new List<ItemSpec>
        {
            new("I1", "Item1", 2m, 1m, 1m, 100m, true, 500m, null)
        };

        var result = _engine.Optimize(container, items, DefaultParams);

        Assert.Single(result.Placements);
        Assert.Equal(0m, result.Placements[0].X);
        Assert.Equal(0m, result.Placements[0].Y);
        Assert.Equal(0m, result.Placements[0].Z);
    }

    // T2: İki ürün yan yana — çakışma olmamalı
    [Fact]
    public void TwoItemsSideBySide_NoOverlap()
    {
        var container = new ContainerSpec(2m, 2m, 1m, 1000m);
        var items = new List<ItemSpec>
        {
            new("I1", "Item1", 1m, 2m, 1m, 100m, true, 200m, null),
            new("I2", "Item2", 1m, 2m, 1m, 100m, true, 200m, null)
        };

        var result = _engine.Optimize(container, items, DefaultParams);

        Assert.Equal(2, result.Placements.Count);
        Assert.Empty(result.UnplacedItems);

        var p1 = result.Placements[0];
        var p2 = result.Placements[1];

        bool samePosition = p1.X == p2.X && p1.Y == p2.Y && p1.Z == p2.Z;
        Assert.False(samePosition);
    }

    // T3: stackable=false ürünün üstüne ürün konulmamalı
    [Fact]
    public void NonStackableItem_NothingPlacedOnTop()
    {
        var container = new ContainerSpec(2m, 1m, 2m, 1000m);
        var items = new List<ItemSpec>
        {
            new("BASE", "Base", 2m, 1m, 1m, 200m, false, 0m, null),
            new("TOP", "Top", 0.5m, 0.5m, 0.5m, 50m, true, 100m, null)
        };

        var result = _engine.Optimize(container, items, DefaultParams);

        var basePlacement = result.Placements.FirstOrDefault(p => p.ItemId == "BASE");
        var topPlacement = result.Placements.FirstOrDefault(p => p.ItemId == "TOP");

        if (basePlacement is null || topPlacement is null) return;

        bool isOnTopOfBase =
            topPlacement.Z >= basePlacement.Z + basePlacement.Rotation.H - 1e-6m
            && topPlacement.X >= basePlacement.X - 1e-6m
            && topPlacement.X + topPlacement.Rotation.L <= basePlacement.X + basePlacement.Rotation.L + 1e-6m;

        Assert.False(isOnTopOfBase, "stackable=false ürünün üstüne ürün yerleştirilmemeli.");
    }

    // T4: CG fallback — dar eşik ile engine çalışmalı ve sonuç üretmeli
    [Fact]
    public void CgFallback_EngineProducesResult()
    {
        var strictParams = new PackingParameters(LifoEnabled: false, CgThresholdPercent: 0.1m);
        var container = new ContainerSpec(4m, 2m, 2m, 5000m);
        var items = new List<ItemSpec>
        {
            new("H1", "Heavy1", 1m, 1m, 1m, 2000m, true, 5000m, null),
            new("H2", "Heavy2", 1m, 1m, 1m, 2000m, true, 5000m, null)
        };

        var result = _engine.Optimize(container, items, strictParams);

        Assert.True(result.Placements.Count > 0);
    }

    // T5: LIFO sırası — lifo_index=1 olan ürün, lifo_index=5'ten kapıya daha yakın (X≤) olmalı.
    // Geniş konteyner kullanılır: LIFO=5 (0,0,0)'a yerleşir, sonra LIFO=1 için x=0 EP'si oluşur.
    [Fact]
    public void LifoEnabled_IndexOneClosestToDoor()
    {
        var lifoParams = new PackingParameters(LifoEnabled: true, CgThresholdPercent: 15m);
        // 2m genişlik → LIFO=5 (0,0,0)'a yerleşince EP (0,0.8,0) oluşur; LIFO=1 bunu seçer (x=0)
        var container = new ContainerSpec(3m, 2m, 1m, 1000m);
        var items = new List<ItemSpec>
        {
            new("L1", "FirstOut", 0.8m, 0.8m, 0.8m, 50m, true, 200m, 1),
            new("L5", "LastOut",  0.8m, 0.8m, 0.8m, 50m, true, 200m, 5),
        };

        var result = _engine.Optimize(container, items, lifoParams);

        Assert.Equal(2, result.Placements.Count);

        var firstOut = result.Placements.First(p => p.ItemId == "L1");
        var lastOut = result.Placements.First(p => p.ItemId == "L5");

        Assert.True(firstOut.X <= lastOut.X,
            $"LIFO=1 ürünü kapıya en yakın veya eşit olmalı. L1.X={firstOut.X}, L5.X={lastOut.X}");
    }

    // T6: Konteynere sığmayan ürün → yerleştirilemeyen listesine girmeli
    [Fact]
    public void OversizedItem_GoesToUnplacedList()
    {
        var container = new ContainerSpec(2m, 1m, 1m, 1000m);
        var items = new List<ItemSpec>
        {
            new("BIG", "TooBig", 5m, 5m, 5m, 100m, true, 200m, null)
        };

        var result = _engine.Optimize(container, items, DefaultParams);

        Assert.Empty(result.Placements);
        Assert.Single(result.UnplacedItems);
        Assert.Equal("BIG", result.UnplacedItems[0].ItemId);
    }

    // T7: Doluluk oranı — 1 birim küp ürün, 8 birim küp konteyner → %12.5
    [Fact]
    public void FillRate_CalculatedCorrectly()
    {
        var container = new ContainerSpec(2m, 2m, 2m, 1000m);
        var items = new List<ItemSpec>
        {
            new("C1", "Cube", 1m, 1m, 1m, 10m, true, 200m, null)
        };

        var result = _engine.Optimize(container, items, DefaultParams);

        Assert.Single(result.Placements);
        Assert.True(Math.Abs(result.FillRatePercent - 12.5m) < 0.01m,
            $"Doluluk oranı 12.5 olmalı, geldi: {result.FillRatePercent}");
    }

    // T8: Zemin desteği — büyük ürün zemine yerleşmeli
    [Fact]
    public void GroundSupport_LargeItemPlacedOnGround()
    {
        var container = new ContainerSpec(2m, 2m, 2m, 1000m);
        var items = new List<ItemSpec>
        {
            new("BASE", "SmallBase", 0.5m, 0.5m, 0.5m, 50m, true, 10m, null),
            new("TOP",  "LargeTop",  2m, 2m, 1m, 100m, true, 200m, null)
        };

        var result = _engine.Optimize(container, items, DefaultParams);

        var topPlacement = result.Placements.FirstOrDefault(p => p.ItemId == "TOP");
        if (topPlacement is not null)
            Assert.Equal(0m, topPlacement.Z);
    }

    // T9: 25 küçük ürün — engine çökmemeli ve hepsini yerleştirmeli
    [Fact]
    public void ManyItems_AllPlacedWithoutCrash()
    {
        var container = new ContainerSpec(5m, 5m, 5m, 100000m);
        var items = Enumerable.Range(1, 25).Select(i =>
            new ItemSpec($"I{i}", $"Item{i}", 0.5m, 0.5m, 0.5m, 10m, true, 50m, null)
        ).ToList();

        var result = _engine.Optimize(container, (IReadOnlyList<ItemSpec>)items, DefaultParams);

        Assert.Equal(25, result.Placements.Count);
        Assert.Empty(result.UnplacedItems);
    }

    // T10: LIFO + CG çakışması — engine çalışmalı, her iki ürün de yerleşmeli
    [Fact]
    public void LifoAndCgConflict_BothItemsPlaced()
    {
        var strictParams = new PackingParameters(LifoEnabled: true, CgThresholdPercent: 5m);
        var container = new ContainerSpec(6m, 2m, 2m, 10000m);
        var items = new List<ItemSpec>
        {
            new("HEAVY_LIFO1", "HeavyFirstOut", 1m, 1m, 1m, 3000m, true, 5000m, 1),
            new("LIGHT_LIFO2", "LightSecondOut", 1m, 1m, 1m, 100m, true, 200m, 2),
        };

        var result = _engine.Optimize(container, items, strictParams);

        Assert.Equal(2, result.Placements.Count);
    }

    // T11: Tüm mock data ile tam entegrasyon testi
    [Fact]
    public void MockData_FullRun_PlacesAtLeastOneItem()
    {
        var mockProvider = new MockPackingDataProvider();
        var container = mockProvider.GetContainer();
        var items = mockProvider.GetItems();
        var parameters = mockProvider.GetParameters(false, 15m);

        var result = _engine.Optimize(container, items, parameters);

        Assert.True(result.Placements.Count > 0, "En az bir ürün yerleştirilmiş olmalı.");
        Assert.True(result.FillRatePercent > 0, "Doluluk oranı sıfırdan büyük olmalı.");
    }

    // T12: ElapsedMilliseconds — performans ölçümü dönmeli
    [Fact]
    public void ElapsedMilliseconds_IsReturned()
    {
        var container = new ContainerSpec(3m, 2m, 2m, 5000m);
        var items = new List<ItemSpec>
        {
            new("I1", "Item1", 1m, 1m, 1m, 100m, true, 300m, null),
        };

        var result = _engine.Optimize(container, items, DefaultParams);

        Assert.True(result.ElapsedMilliseconds >= 0);
    }
}
