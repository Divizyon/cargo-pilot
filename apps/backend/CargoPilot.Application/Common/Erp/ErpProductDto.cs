namespace CargoPilot.Application.Common.Erp;

public sealed record ErpProductDto(
    string ErpId,
    string Sku,
    string Name,
    string ProductType,
    decimal Width,
    decimal Height,
    decimal Length,
    decimal Weight,
    string? Category,
    string? Warehouse,
    string? Barcode,
    decimal? Diameter,
    IReadOnlyDictionary<string, string?> ErpConstraints,
    string RawDataJson);
