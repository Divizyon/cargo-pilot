using CargoPilot.Application.Common.Items;
using CargoPilot.Application.Common.Models;
using CargoPilot.Domain.Enums;
using MediatR;

namespace CargoPilot.Application.Features.DraftItems.UpdateDraftItem;

public sealed record UpdateDraftItemCommand(
    Guid Id,
    string ProductType,
    ItemCategory Category,
    decimal Width,
    decimal Height,
    decimal Length,
    decimal Weight,
    decimal? Diameter,
    FragilityType FragilityType,
    bool IsStackable,
    int MaxStackCount,
    decimal MaxWeightOnTop,
    AllowedRotations AllowedRotations,
    string? Barcode,
    string? StackGroup,
    string[]? IncompatibleGroups,
    string? SpecialNotes,
    int[]? ConstraintIds) : IItemSpec, IRequest<Result<Unit>>;
