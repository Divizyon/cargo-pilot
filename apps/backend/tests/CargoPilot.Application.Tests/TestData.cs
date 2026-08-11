using CargoPilot.Application.Common.Erp;
using CargoPilot.Domain.Entities;
using CargoPilot.Domain.Enums;

namespace CargoPilot.Application.Tests;

/// <summary>Testlerde tekrar eden entity/DTO kurulumlari.</summary>
internal static class TestData
{
    public static Integration CreateIntegration(Guid id, Guid companyId) =>
        new(id, companyId, "Netsis", "localhost", mappingTable: null, syncInterval: null, authCredentials: null);

    public static ErpSettings CreateErpSettings(Guid companyId) =>
        new(Guid.NewGuid(), companyId, ErpProviderType.Netsis, "DIVIZYON", "sa", "sifreli", "localhost");

    public static ErpProductDto CreateErpProduct(
        string erpId = "ERP-1",
        string sku = "SKU-1",
        string name = "Test Urun",
        decimal width = 10m,
        decimal weight = 5m,
        IReadOnlyList<string>? missingFields = null) =>
        new(
            ErpId: erpId,
            Sku: sku,
            Name: name,
            ProductType: "STANDARD",
            Width: width,
            Height: 20m,
            Length: 30m,
            Weight: weight,
            Category: "Package",
            Warehouse: null,
            Barcode: null,
            Diameter: null,
            ErpConstraints: new Dictionary<string, string?>(),
            RawDataJson: "{}",
            MissingFields: missingFields);

    public static DraftItem CreateDraftItem(
        Guid companyId,
        Guid integrationId,
        string erpId = "ERP-1",
        IReadOnlyList<string>? missingFields = null) =>
        new(
            Guid.NewGuid(),
            companyId,
            integrationId,
            erpId,
            "{}",
            "SKU-1",
            "Eski Ad",
            "STANDARD",
            ItemCategory.Package,
            10m,
            20m,
            30m,
            5m,
            FragilityType.NonFragile,
            isStackable: true,
            maxStackCount: 1,
            maxWeightOnTop: 0m,
            AllowedRotations.All,
            barcode: null,
            diameter: null,
            missingFields: missingFields);

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
