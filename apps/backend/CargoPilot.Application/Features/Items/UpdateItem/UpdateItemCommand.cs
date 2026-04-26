using CargoPilot.Application.Common.Models;
using CargoPilot.Domain.Enums;
using MediatR;

namespace CargoPilot.Application.Features.Items.UpdateItem;

public sealed record UpdateItemCommand(
    Guid Id,
    string SKU,
    string? Barcode,
    string Name,
    string ProductType,
    ItemCategory Category,
    decimal Width,
    LengthUnit WidthUnit,
    decimal Height,
    LengthUnit HeightUnit,
    decimal Length,
    LengthUnit LengthUnit,
    decimal? Diameter,
    decimal Weight,
    WeightUnit WeightUnit,
    FragilityType FragilityType,
    bool IsStackable,
    int MaxStackCount,
    decimal MaxWeightOnTop,
    AllowedRotations AllowedRotations,
    string? ImageUrl,
    string? StackGroup,
    string? SpecialNotes) : IRequest<Result<Guid>>;
