using CargoPilot.Application.Common.Models;
using CargoPilot.Application.Common.Optimization;
using CargoPilot.Domain.Enums;

namespace CargoPilot.Infrastructure.Tests;

/// <summary>
/// LIFO grup bolgelerinin kapi yonune gore dogru eslendigini sabitler.
/// Koordinat sozlesmesi (docs/COORDINATE_STANDARD.md): uzak yuz z=0, referans
/// kapi z=length. UnloadingOrder=1 ilk inecek gruptur, bu yuzden kapiya en
/// yakin — yani en buyuk Z'deki — bolgede olmalidir.
/// </summary>
public sealed class GroupZoneTests
{
    private const decimal VehicleWidth = 100m;
    private const decimal VehicleHeight = 100m;
    private const decimal VehicleLength = 300m;
    private const decimal BoxLength = 50m;

    [Fact]
    public void Lifo_IlkInecekGrup_KapiyaEnYakinBolgeyeYerlesir()
    {
        var (result, itemsByOrder, _) = RunWithThreeGroups();

        var zByOrder = itemsByOrder.ToDictionary(
            pair => pair.Key,
            pair => SinglePlacement(result, pair.Value).Z);

        Assert.True(zByOrder[1] > zByOrder[2],
            $"unloadingOrder=1 kapiya (z=length) daha yakin olmali. Z: 1={zByOrder[1]}, 2={zByOrder[2]}");
        Assert.True(zByOrder[2] > zByOrder[3],
            $"unloadingOrder=2, 3'ten kapiya daha yakin olmali. Z: 2={zByOrder[2]}, 3={zByOrder[3]}");
    }

    /// <summary>
    /// LIFO'nun uzaysal kurali BANT degil CIKARILABILIRLIKTIR: her kutu, kendi
    /// inis sirasi geldiginde hala aracta olan hicbir kutuyu oynatmadan kapiya
    /// cikabilmelidir. Gruplar uzayda ic ice gecebilir.
    ///
    /// Bant modeli olculdu ve birakildi: dar bant kutulari zorunlu tasitiyor,
    /// genis bant hic baglamiyordu. Ustelik bant ICINDE kalan bir kutu da pekala
    /// baska bir kutunun arkasinda sikismis olabilirdi -- yani bant, operasyonel
    /// gereksinimi hic ifade etmiyordu.
    /// </summary>
    [Fact]
    public void Lifo_HerKutu_BosaltmaSirasiGeldiginde_Cikarilabilir()
    {
        var (result, itemsByOrder, input) = RunWithThreeGroups();

        Assert.True(itemsByOrder.Count >= 2, "Senaryo cok gruplu degil; kural hic sinanmiyor.");

        var orderByItemId = input.Items
            .Where(i => i.UnloadingOrder.HasValue)
            .ToDictionary(i => i.ItemId, i => i.UnloadingOrder!.Value);

        foreach (var box in result.Placements)
        {
            if (!orderByItemId.TryGetValue(box.ItemId, out var mine)) continue;

            var doorSide = box.Z + box.Length;

            foreach (var other in result.Placements)
            {
                if (!orderByItemId.TryGetValue(other.ItemId, out var theirs) || theirs == mine) continue;
                if (other.X >= box.X + box.Width || other.X + other.Width <= box.X) continue;
                if (other.Y >= box.Y + box.Height || other.Y + other.Height <= box.Y) continue;

                var otherDoorSide = other.Z + other.Length;
                var blocks = theirs > mine ? otherDoorSide > doorSide : doorSide > otherDoorSide;

                Assert.False(blocks,
                    $"sira {mine} @({box.X},{box.Y},{box.Z}) onunde sira {theirs} @({other.X},{other.Y},{other.Z})");
            }
        }
    }

    private static (OptimizationResult Result, Dictionary<int, Guid> ItemsByOrder, OptimizationInput Input) RunWithThreeGroups()
    {
        var itemsByOrder = new Dictionary<int, Guid>();
        var items = new List<OptimizationItemInput>();

        foreach (var unloadingOrder in new[] { 1, 2, 3 })
        {
            var item = CreateItem(unloadingOrder);
            itemsByOrder[unloadingOrder] = item.ItemId;
            items.Add(item);
        }

        var input = new OptimizationInput(
            VehicleWidth,
            VehicleHeight,
            VehicleLength,
            VehicleMaxWeight: 10_000m,
            items,
            LoadingPlanOptimizationCriteria.Lifo,
            LoadingType.Rear);

        return (new OptimizationEngine().Run(input), itemsByOrder, input);
    }

    private static PlacedItemResult SinglePlacement(OptimizationResult result, Guid itemId)
        => Assert.Single(result.Placements, p => p.ItemId == itemId);

    private static OptimizationItemInput CreateItem(int unloadingOrder)
        => new(
            ItemId: Guid.NewGuid(),
            SKU: $"SKU-{unloadingOrder}",
            Name: $"Urun {unloadingOrder}",
            Width: VehicleWidth,
            Height: VehicleHeight,
            Length: BoxLength,
            Weight: 100m,
            IsStackable: false,
            MaxStackCount: 1,
            MaxWeightOnTop: 0m,
            AllowedRotations: AllowedRotations.Fixed,
            Quantity: 1,
            GroupId: Guid.NewGuid(),
            UnloadingOrder: unloadingOrder);
}
