using CargoPilot.Application.Common.Items;
using CargoPilot.Application.Common.Models;
using CargoPilot.Domain.Enums;
using MediatR;

namespace CargoPilot.Application.Features.Items.CreateItem;

public sealed record CreateItemCommand(
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
    string[]? IncompatibleGroups,
    string? SpecialNotes,
    int[]? ConstraintIds = null) : IItemSpec, IRequest<Result<Guid>>;
