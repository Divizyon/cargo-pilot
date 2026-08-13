using System.Globalization;
using CargoPilot.Application.Common.Erp;
using CargoPilot.Domain.Entities;
using CargoPilot.Domain.Enums;

namespace CargoPilot.Application.Tests;

/// <summary>Testlerde tekrar eden entity/DTO kurulumlari.</summary>
internal static class TestData
{
    public static Integration CreateIntegration(Guid id, Guid companyId) =>
        new(id, companyId, "Netsis", "localhost", mappingTable: null, syncInterval: null);

    public static ErpSettings CreateErpSettings(
        Guid companyId,
        ErpProviderType providerType = ErpProviderType.Netsis) =>
        new(Guid.NewGuid(), companyId, providerType, "MUSTERI_DB", "erp_okuyucu", "sifreli", "localhost");

    public static ErpProductDto CreateErpProduct(
        string erpId = "ERP-1",
        string sku = "SKU-1",
        string name = "Test Urun",
        decimal width = 10m,
        decimal weight = 5m,
        IReadOnlyList<string>? missingFields = null,
        string? groupCode = null,
        string? rawDataJson = null) =>
        new(
            ErpId: erpId,
            Sku: sku,
            Name: name,
            ProductType: "STANDARD",
            Width: width,
            Height: 20m,
            Length: 30m,
            Weight: weight,
            GroupCode: groupCode,
            Warehouse: null,
            Barcode: null,
            Diameter: null,
            ErpConstraints: new Dictionary<string, string?>(),
            // Gercekte oldugu gibi anlik goruntu satirin icerigini yansitir; boylece
            // farkli bir urun farkli bir JSON uretir ve degisiklik tespiti calisir.
            RawDataJson: rawDataJson ?? ErpSnapshot(sku, name, width, weight),
            MissingFields: missingFields);

    /// <summary>ERP ham veri anlik goruntusu; DraftItem.MatchesErpSnapshot bunu karsilastirir.</summary>
    public static string ErpSnapshot(
        string sku = "SKU-1",
        string name = "Test Urun",
        decimal width = 10m,
        decimal weight = 5m) =>
        string.Create(
            CultureInfo.InvariantCulture,
            $$"""{"Sku":"{{sku}}","Name":"{{name}}","En":{{width}},"BirimAgirlik":{{weight}}}""");

    /// <summary>Elemesiz cekim sonucu; kaynak toplami cekilen satir sayisina esittir.</summary>
    public static ErpFetchResult CreateFetchResult(params ErpProductDto[] products) =>
        ErpFetchResult.WithoutScreening(products);

    /// <summary>Kaynakta eleme yapilmis cekim sonucu.</summary>
    public static ErpFetchResult CreateFetchResult(
        int sourceTotal,
        IReadOnlyDictionary<ErpDropReason, int> droppedAtSource,
        params ErpProductDto[] products) =>
        new(products, sourceTotal, droppedAtSource);

    public static DraftItem CreateDraftItem(
        Guid companyId,
        Guid integrationId,
        string erpId = "ERP-1",
        IReadOnlyList<string>? missingFields = null,
        string sku = "SKU-1",
        decimal width = 10m,
        decimal weight = 5m,
        bool isStackable = true,
        int maxStackCount = 1,
        decimal maxWeightOnTop = 5m,
        string? stackGroup = null,
        string erpRawDataJson = "{}") =>
        new(
            Guid.NewGuid(),
            companyId,
            integrationId,
            erpId,
            erpRawDataJson,
            sku,
            "Eski Ad",
            "STANDARD",
            ItemCategory.Package,
            width,
            20m,
            30m,
            weight,
            FragilityType.NonFragile,
            isStackable,
            maxStackCount,
            maxWeightOnTop,
            AllowedRotations.All,
            barcode: null,
            diameter: null,
            missingFields: missingFields,
            stackGroup: stackGroup);

    /// <summary>ERP tazelemesi; olcu alanlari varsayilan olarak sifir, yani mevcut degeri ezmez.</summary>
    public static DraftItem.ErpRefresh CreateErpRefresh(
        string sku = "SKU-1",
        string name = "Yeni Ad",
        decimal width = 0m,
        decimal height = 0m,
        decimal length = 0m,
        decimal weight = 0m,
        string? barcode = null,
        string? stackGroup = null,
        string[]? incompatibleGroups = null,
        IEnumerable<string>? missingFields = null) =>
        new(sku, name, "{}", width, height, length, weight, barcode, stackGroup, incompatibleGroups, missingFields);

    public static LoadingPlan CreateCalculatedPlan(Guid id, Guid companyId)
    {
        var plan = new LoadingPlan(
            id,
            "Test Plani",
            Guid.NewGuid(),
            LoadingPlanOptimizationCriteria.VolumeFirst,
            inputTotalQuantity: 1,
            companyId);

        plan.ApplyOptimizationResult(
            LoadingPlanOptimizationStatus.Calculated,
            totalWeight: 100m,
            fillRate: 50m,
            placedQuantity: 1,
            unplacedQuantity: 0,
            centerOfGravityX: null,
            centerOfGravityY: null,
            centerOfGravityZ: null);

        return plan;
    }
}
