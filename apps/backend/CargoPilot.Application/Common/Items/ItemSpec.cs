using CargoPilot.Domain.Entities;
using CargoPilot.Domain.Enums;

namespace CargoPilot.Application.Common.Items;

/// <summary>Bir komuta bagli olmayan Item alan kumesi; taslak onayinda dogrulama girdisidir.</summary>
public sealed record ItemSpec(
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
    string? Barcode,
    string? ImageUrl,
    string? StackGroup,
    string[]? IncompatibleGroups,
    string? SpecialNotes,
    int[]? ConstraintIds) : IItemSpec
{
    public static ItemSpec FromDraft(DraftItem draft) => new(
        draft.ProductType,
        draft.Category,
        draft.Width,
        draft.Height,
        draft.Length,
        draft.Diameter,
        draft.Weight,
        draft.FragilityType,
        draft.IsStackable,
        draft.MaxStackCount,
        draft.MaxWeightOnTop,
        draft.AllowedRotations,
        draft.Barcode,
        draft.ImageUrl,
        draft.StackGroup,
        IncompatibleGroups: null,
        draft.SpecialNotes,
        draft.GetConstraintIds());
}
