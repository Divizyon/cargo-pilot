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

    [Fact]
    public void Lifo_HerGrup_KendiBolgesininSinirlariIcindeKalir()
    {
        var (result, itemsByOrder, input) = RunWithThreeGroups();

        var zones = LifoPlacement.ComputeGroupZones(
            input.Items,
            input.VehicleLength,
            OptimizationModules.Resolve(input).UseLifo);

        Assert.NotEmpty(zones);

        foreach (var (unloadingOrder, itemId) in itemsByOrder)
        {
            // Bolge sinirlari uretim fonksiyonundan okunur, testte ikinci kez
            // yazilmaz: formul degistiginde test eski kurala gore olcup sahte
            // ihlal ya da sahte basari raporlardi (denetim S-63).
            var (zoneStart, zoneEnd) = zones[unloadingOrder];
            var placement = SinglePlacement(result, itemId);

            Assert.True(placement.Z >= zoneStart && placement.Z + placement.Length <= zoneEnd,
                $"unloadingOrder={unloadingOrder} bolgesi [{zoneStart},{zoneEnd}] disinda: " +
                $"Z={placement.Z}, uzunluk={placement.Length}");
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
