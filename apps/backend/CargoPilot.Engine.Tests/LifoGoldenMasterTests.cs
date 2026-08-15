using CargoPilot.Application.Common.Models;
using CargoPilot.Domain.Enums;
using CargoPilot.Engine.Tests.Golden;

namespace CargoPilot.Engine.Tests;

/// <summary>
/// LIFO kriterinin mevcut davranışını kilitler: ComputeGroupZones bölge ayrımı,
/// bölge tohumlaması ve "geç inen, erken inenin üstüne konamaz" istif kuralı.
/// Koordinat sözleşmesi (docs/COORDINATE_STANDARD.md): uzak yüz Z=0, referans
/// kapı (TIR'da back door) Z=Length. İlk inecek grup kapıya en yakın bölgededir.
/// </summary>
public sealed class LifoGoldenMasterTests
{
    private const LoadingPlanOptimizationCriteria Criteria = LoadingPlanOptimizationCriteria.Lifo;

    /// <summary>İki farklı UnloadingOrder: araç uzunluğu iki bölgeye ayrılır.</summary>
    [Fact]
    public void Lifo_IkiGrup_ArkaKapi_BolgelereAyrilir()
    {
        var items = new List<OptimizationItemInput>
        {
            GroupItem(1, groupIndex: 1, unloadingOrder: 1, length: 50m),
            GroupItem(2, groupIndex: 2, unloadingOrder: 2, length: 50m),
        };

        EngineScenario.Verify(
            nameof(Lifo_IkiGrup_ArkaKapi_BolgelereAyrilir),
            CorridorVehicle(items, LoadingType.Rear));
    }

    /// <summary>Üç grup: UnloadingOrder arttıkça bölge kapıdan uzaklaşır.</summary>
    [Fact]
    public void Lifo_UcGrup_ArkaKapi_BolgeSirasiKorunur()
    {
        EngineScenario.Verify(
            nameof(Lifo_UcGrup_ArkaKapi_BolgeSirasiKorunur),
            CorridorVehicle(ThreeGroupItems(), LoadingType.Rear));
    }

    /// <summary>
    /// Grupsuz ürünler: ComputeGroupZones boş döner (GroupId ve UnloadingOrder
    /// birlikte aranır), bölge cezası hiç uygulanmaz.
    /// </summary>
    [Fact]
    public void Lifo_GrupsuzUrunler_BolgeUygulanmaz()
    {
        var items = new List<OptimizationItemInput>
        {
            EngineScenario.Item(1, width: 100m, height: 100m, length: 40m, weight: 100m, quantity: 2, allowedRotations: AllowedRotations.Fixed),
            EngineScenario.Item(2, width: 100m, height: 100m, length: 40m, weight: 100m, quantity: 2, allowedRotations: AllowedRotations.Fixed),
            EngineScenario.Item(3, width: 100m, height: 100m, length: 40m, weight: 100m, quantity: 2, allowedRotations: AllowedRotations.Fixed),
        };

        EngineScenario.Verify(
            nameof(Lifo_GrupsuzUrunler_BolgeUygulanmaz),
            CorridorVehicle(items, LoadingType.Rear));
    }

    /// <summary>
    /// Yan kapı yüklemesi: gruplar tanımlı olsa da bölge ayrımı yalnızca arka kapıda
    /// geçerlidir, kutular kapıdan itibaren sıkıştırılır.
    /// </summary>
    [Fact]
    public void Lifo_YanKapi_BolgeUygulanmaz()
    {
        EngineScenario.Verify(
            nameof(Lifo_YanKapi_BolgeUygulanmaz),
            CorridorVehicle(ThreeGroupItems(), LoadingType.SideRight));
    }

    /// <summary>
    /// Kümeleme kapalı: sıralama hacme göre yapıldığı için geç inen (UnloadingOrder=2)
    /// kutu, erken inen (UnloadingOrder=1) kutunun üstüne konmak zorunda kalır ve
    /// LIFO istif kuralı bunu reddeder.
    /// </summary>
    [Fact]
    public void Lifo_KumelemeKapali_GecInenErkenIneninUstuneKonamaz()
    {
        var items = new List<OptimizationItemInput>
        {
            EngineScenario.Item(
                1,
                width: 100m,
                height: 100m,
                length: 100m,
                weight: 50m,
                allowedRotations: AllowedRotations.Fixed,
                groupIndex: 1,
                unloadingOrder: 1),
            EngineScenario.Item(
                2,
                width: 100m,
                height: 90m,
                length: 100m,
                weight: 40m,
                allowedRotations: AllowedRotations.Fixed,
                groupIndex: 2,
                unloadingOrder: 2),
        };

        EngineScenario.Verify(
            nameof(Lifo_KumelemeKapali_GecInenErkenIneninUstuneKonamaz),
            EngineScenario.Input(
                items,
                Criteria,
                vehicleWidth: 100m,
                vehicleHeight: 200m,
                vehicleLength: 100m,
                vehicleMaxWeight: 10_000m,
                loadingType: LoadingType.Rear,
                clusterGroups: false));
    }

    private static List<OptimizationItemInput> ThreeGroupItems()
        => new()
        {
            GroupItem(1, groupIndex: 1, unloadingOrder: 1, length: 40m),
            GroupItem(2, groupIndex: 2, unloadingOrder: 2, length: 40m),
            GroupItem(3, groupIndex: 3, unloadingOrder: 3, length: 40m),
        };

    private static OptimizationItemInput GroupItem(int index, int groupIndex, int unloadingOrder, decimal length)
        => EngineScenario.Item(
            index,
            width: 100m,
            height: 100m,
            length: length,
            weight: 100m,
            quantity: 2,
            allowedRotations: AllowedRotations.Fixed,
            groupIndex: groupIndex,
            unloadingOrder: unloadingOrder);

    private static OptimizationInput CorridorVehicle(IReadOnlyList<OptimizationItemInput> items, LoadingType loadingType)
        => EngineScenario.Input(
            items,
            Criteria,
            vehicleWidth: EngineScenario.CorridorWidth,
            vehicleHeight: EngineScenario.CorridorHeight,
            vehicleLength: EngineScenario.CorridorLength,
            vehicleMaxWeight: 10_000m,
            loadingType: loadingType);
}
