using CargoPilot.Domain.Enums;

namespace CargoPilot.Application.Features.Items.GetItemById;

public sealed record ItemDetailDto(
    Guid Id,
    string SKU,
    string? Barcode,
    string Name,
    string ProductType,
    ItemCategory Category,
    decimal Width,
    decimal Height,
    decimal Length,
    decimal? Diameter,
    decimal Weight,
    FragilityType FragilityType,
    int[] ConstraintIds,
    bool IsStackable,
    int MaxStackCount,
    decimal MaxWeightOnTop,
    AllowedRotations AllowedRotations,
    string? ImageUrl,
    string? StackGroup,
    string? SpecialNotes,
    string? ErpProviderName);
