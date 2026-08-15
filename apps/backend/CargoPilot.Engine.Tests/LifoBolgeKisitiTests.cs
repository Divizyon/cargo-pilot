using CargoPilot.Application.Common.Models;
using CargoPilot.Application.Common.Optimization;
using CargoPilot.Domain.Enums;
using CargoPilot.Engine.Tests.Golden;

namespace CargoPilot.Engine.Tests;

/// <summary>
/// LIFO grup bölgesinin SERT kısıt olduğunu kilitler: bölge içinde geçerli bir
/// aday varsa motor bölge dışına yerleşemez. Golden master senaryolarının hepsi
/// tek katmanlı olduğu için bölge-yerçekimi çatışması orada hiç tetiklenmiyor;
/// bu iki senaryo çatışmayı bilerek üretir.
///
/// Sahne sözleşmesi: arka kapı Z=0, araç önü Z=VehicleLength.
/// </summary>
public sealed class LifoBolgeKisitiTests
{
    private const LoadingPlanOptimizationCriteria Criteria = LoadingPlanOptimizationCriteria.Lifo;

    private const decimal VehicleWidth = 100m;
    private const decimal VehicleHeight = 200m;
    private const decimal VehicleLength = 200m;

    /// <summary>
    /// P1 — İki grup × 4 kutu (100×50×100). Bölgeler [0,100) ve [100,200);
    /// kutu derinliği bölge boyuna eşittir, yani her kutunun bölge içi geçerli
    /// bir adayı vardır. Yumuşak cezayla motor 8 kutudan 4'ünü yanlış bölgeye
    /// koyuyordu: 100 cm taşma × 2 000 = 200 000, bir kat yükselme ise
    /// 50 cm × 1 000 000 = 50 000 000.
    /// </summary>
    [Fact]
    public void Lifo_CokKatmanli_IkiGrup_HicbirKutuBolgeDisinaTasmaz()
    {
        var items = new List<OptimizationItemInput>
        {
            Box(index: 1, width: 100m, height: 50m, length: 100m, quantity: 4, unloadingOrder: 1),
            Box(index: 2, width: 100m, height: 50m, length: 100m, quantity: 4, unloadingOrder: 2),
        };

        var input = Vehicle(items);
        var result = EngineScenario.Run(input);

        AssertAllPlacementsInsideZone(input, result);

        // Kapasite paritesi: sert kısıt kutu kaybettirmemeli.
        Assert.Equal(8, result.Placements.Count);
        Assert.Equal(1m, result.FillRate);
    }

    /// <summary>
    /// P2 — Ayırt edici senaryo: grup1'in ikinci sıra kutusu bölgesini yalnız
    /// 20 cm aşar (20 × 2 000 = 40 000), bölge içi alternatifi ise bir kat
    /// yukarıdadır (50 × 1 000 000). Bölge katsayısını büyütmek bu senaryoyu
    /// çözmez; yalnız iki kademeli seçim çözer.
    /// </summary>
    [Fact]
    public void Lifo_KucukTasma_BolgeIciAdayVarkenTasmaSecilmez()
    {
        var items = new List<OptimizationItemInput>
        {
            Box(index: 1, width: 50m, height: 50m, length: 60m, quantity: 4, unloadingOrder: 1),
            Box(index: 2, width: 50m, height: 50m, length: 100m, quantity: 1, unloadingOrder: 2),
        };

        var input = Vehicle(items);
        var result = EngineScenario.Run(input);

        AssertAllPlacementsInsideZone(input, result);

        Assert.Equal(5, result.Placements.Count);
        Assert.Equal(0.2125m, result.FillRate);
    }

    private static OptimizationItemInput Box(
        int index,
        decimal width,
        decimal height,
        decimal length,
        int quantity,
        int unloadingOrder)
        => EngineScenario.Item(
            index,
            width: width,
            height: height,
            length: length,
            weight: 10m,
            quantity: quantity,
            allowedRotations: AllowedRotations.Fixed,
            groupIndex: index,
            unloadingOrder: unloadingOrder);

    private static OptimizationInput Vehicle(IReadOnlyList<OptimizationItemInput> items)
        => EngineScenario.Input(
            items,
            Criteria,
            vehicleWidth: VehicleWidth,
            vehicleHeight: VehicleHeight,
            vehicleLength: VehicleLength,
            loadingType: LoadingType.Rear,
            clusterGroups: true);

    /// <summary>
    /// Bölge sınırlarını ve "içeride mi" yüklemini motorun kendi kodundan alır:
    /// <see cref="LifoPlacement.ComputeGroupZones"/> ve
    /// <see cref="LifoPlacement.IsInsideZone"/>. Formül testte ikinci kez
    /// yazılmaz; aksi hâlde üretim kodu değiştiğinde test eski kurala göre
    /// ölçüp sahte ihlal ya da sahte başarı raporlar.
    /// </summary>
    private static void AssertAllPlacementsInsideZone(
        OptimizationInput input,
        OptimizationResult result)
    {
        var zones = LifoPlacement.ComputeGroupZones(
            input.Items,
            input.VehicleLength,
            input.ZonesApply,
            OptimizationModules.Resolve(input).UseLifo);

        // Bölge hiç kurulmazsa aşağıdaki döngü sessizce geçerdi; senaryonun
        // gerçekten bölgeli olduğu burada sabitlenir.
        Assert.NotEmpty(zones);

        var orderByItemId = input.Items.ToDictionary(i => i.ItemId, i => i.UnloadingOrder!.Value);
        var ihlaller = new List<string>();

        foreach (var p in result.Placements)
        {
            var zone = zones[orderByItemId[p.ItemId]];

            if (!LifoPlacement.IsInsideZone(zone.ZStart, zone.ZEnd, p.Z, p.Length))
                ihlaller.Add($"Z={p.Z} L={p.Length} bölge=[{zone.ZStart},{zone.ZEnd})");
        }

        Assert.True(
            ihlaller.Count == 0,
            $"Bölge dışına taşan yerleşim: {ihlaller.Count}/{result.Placements.Count}{Environment.NewLine}"
            + string.Join(Environment.NewLine, ihlaller));
    }
}
