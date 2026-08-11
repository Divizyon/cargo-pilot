using CargoPilot.Domain.Enums;

namespace CargoPilot.Application.Common.Items;

/// <summary>
/// Item olusturan tum yollarin (tekil kayit, Excel toplu import, ERP taslak onayi)
/// paylastigi alan kumesi. Ortak dogrulama ve kurulum bu sozlesme uzerinden yurur.
/// </summary>
public interface IItemSpec
{
    string ProductType { get; }
    ItemCategory Category { get; }
    decimal Width { get; }
    decimal Height { get; }
    decimal Length { get; }
    decimal? Diameter { get; }
    decimal Weight { get; }
    FragilityType FragilityType { get; }
    bool IsStackable { get; }
    int MaxStackCount { get; }
    decimal MaxWeightOnTop { get; }
    AllowedRotations AllowedRotations { get; }
    string? Barcode { get; }
    string? ImageUrl { get; }
    string? StackGroup { get; }
    string[]? IncompatibleGroups { get; }
    string? SpecialNotes { get; }
    int[]? ConstraintIds { get; }
}
