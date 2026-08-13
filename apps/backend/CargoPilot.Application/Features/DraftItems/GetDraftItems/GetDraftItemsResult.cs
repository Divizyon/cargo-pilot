using CargoPilot.Domain.Enums;

namespace CargoPilot.Application.Features.DraftItems.GetDraftItems;

/// <summary>
/// <paramref name="AvailableCategories"/> tip filtresinin secenekleridir: kategori
/// filtresinden bagimsiz, durum kumesinin tamamindan cikarilir. Acik sayfadan
/// turetilseydi filtre uygulandikca secenekler kaybolurdu.
/// </summary>
public sealed record GetDraftItemsResult(
    IReadOnlyList<DraftItemDto> Items,
    int TotalCount,
    int Page,
    int PageSize,
    IReadOnlyList<ItemCategory> AvailableCategories);

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
    string? StackGroup,
    string? SpecialNotes,
    int[] ConstraintIds,
    string[] IncompatibleGroups,
    DateTime CreatedAtUtc,
    string? IntegrationSystemName,
    IReadOnlyList<string> MissingFields);
