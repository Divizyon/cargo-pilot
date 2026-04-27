using CargoPilot.Domain.Enums;

namespace CargoPilot.Application.Features.Items.SearchItems;

public sealed record ItemSummaryDto(
    Guid Id,
    string SKU,
    string? Barcode,
    string Name,
    string ProductType,
    ItemCategory Category,
    decimal Width,
    decimal Height,
    decimal Length,
    decimal Weight,
    FragilityType FragilityType,
    bool IsStackable);
