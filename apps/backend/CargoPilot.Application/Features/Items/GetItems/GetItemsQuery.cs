using CargoPilot.Application.Common.Models;
using MediatR;

namespace CargoPilot.Application.Features.Items.GetItems;

public sealed record GetItemsQuery(
    Guid? CompanyId,
    string? Search,
    int Page = 1,
    int PageSize = 20) : IRequest<Result<PagedResult<ItemDto>>>;

public sealed record ItemDto(
    Guid Id,
    string SKU,
    string? Barcode,
    string Name,
    string ProductType,
    string Category,
    decimal Width,
    decimal Height,
    decimal Length,
    decimal? Diameter,
    decimal Weight,
    string FragilityType,
    bool IsStackable,
    int MaxStackCount,
    decimal MaxWeightOnTop,
    string AllowedRotations,
    string? ImageUrl,
    string? StackGroup,
    string? SpecialNotes);

public sealed record PagedResult<T>(
    IReadOnlyList<T> Items,
    int TotalCount,
    int Page,
    int PageSize,
    int TotalPages);