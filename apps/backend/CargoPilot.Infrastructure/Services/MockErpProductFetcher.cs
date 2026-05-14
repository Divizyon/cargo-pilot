using CargoPilot.Application.Common.Erp;
using CargoPilot.Application.Common.Interfaces;
using System.Text.Json;

namespace CargoPilot.Infrastructure.Services;

internal sealed class MockErpProductFetcher : IErpProductFetcher
{
    public Task<IReadOnlyList<ErpProductDto>> FetchAsync(
        string apiEndpoint,
        string? authCredentialsJson,
        string? categoryFilter,
        string? warehouseFilter,
        CancellationToken cancellationToken = default)
    {
        var products = new List<ErpProductDto>
        {
            new(
                ErpId: "ERP-001",
                Sku: "SKU-001",
                Name: "Test Ürün 1",
                ProductType: "Standart",
                Width: 30m,
                Height: 20m,
                Length: 40m,
                Weight: 5m,
                Category: "Box",
                Warehouse: "Depo-1",
                Barcode: "1234567890",
                Diameter: null,
                ErpConstraints: new Dictionary<string, string?> { ["DikTasinacak"] = "0" },
                RawDataJson: JsonSerializer.Serialize(new { ErpId = "ERP-001", Sku = "SKU-001" })),

            new(
                ErpId: "ERP-002",
                Sku: "SKU-002",
                Name: "Test Ürün 2",
                ProductType: "Kırılgan",
                Width: 15m,
                Height: 15m,
                Length: 15m,
                Weight: 1m,
                Category: "Package",
                Warehouse: "Depo-1",
                Barcode: null,
                Diameter: null,
                ErpConstraints: new Dictionary<string, string?> { ["Kirilgan"] = "Evet" },
                RawDataJson: JsonSerializer.Serialize(new { ErpId = "ERP-002", Sku = "SKU-002" }))
        };

        IReadOnlyList<ErpProductDto> filtered = products
            .Where(p => categoryFilter is null || string.Equals(p.Category, categoryFilter, StringComparison.OrdinalIgnoreCase))
            .Where(p => warehouseFilter is null || string.Equals(p.Warehouse, warehouseFilter, StringComparison.OrdinalIgnoreCase))
            .ToList();

        return Task.FromResult(filtered);
    }
}
