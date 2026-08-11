using CargoPilot.Domain.Enums;

namespace CargoPilot.Application.Features.DraftItems.GetDraftItems;

public sealed record GetDraftItemsResult(
    IReadOnlyList<DraftItemDto> Items,
    int TotalCount,
    int Page,
    int PageSize);

public sealed record DraftItemDto(
    Guid Id,
    string ErpId,
    DraftItemStatus Status,
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
    bool IsStackable,
    int MaxStackCount,
    decimal MaxWeightOnTop,
    AllowedRotations AllowedRotations,
    string? ImageUrl,
    string? StackGroup,
    string? SpecialNotes,
    int[] ConstraintIds,
    string[] IncompatibleGroups,
    DateTime CreatedAtUtc,
    string? IntegrationSystemName,
    IReadOnlyList<string> MissingFields);
