using CargoPilot.Application.Common.Interfaces;
using CargoPilot.Application.Common.Models;
using MediatR;

namespace CargoPilot.Application.Features.Items.GetItems;

internal sealed class GetItemsQueryHandler : IRequestHandler<GetItemsQuery, Result<PagedResult<ItemDto>>>
{
    private readonly IItemRepository _itemRepository;

    public GetItemsQueryHandler(IItemRepository itemRepository)
    {
        _itemRepository = itemRepository;
    }

    public async Task<Result<PagedResult<ItemDto>>> Handle(
        GetItemsQuery request,
        CancellationToken cancellationToken)
    {
        var items = await _itemRepository.GetAllAsync(
            request.CompanyId,
            request.Search,
            request.Page,
            request.PageSize,
            cancellationToken);

        var totalCount = await _itemRepository.CountAsync(
            request.CompanyId,
            request.Search,
            cancellationToken);

        var dtos = items.Select(item => new ItemDto(
            item.Id,
            item.SKU,
            item.Barcode,
            item.Name,
            item.ProductType,
            item.Category.ToString(),
            item.Width,
            item.Height,
            item.Length,
            item.Diameter,
            item.Weight,
            item.FragilityType.ToString(),
            item.IsStackable,
            item.MaxStackCount,
            item.MaxWeightOnTop,
            item.AllowedRotations.ToString(),
            item.ImageUrl,
            item.StackGroup,
            item.SpecialNotes)).ToList();

        var totalPages = (int)Math.Ceiling(totalCount / (double)request.PageSize);

        var pagedResult = new PagedResult<ItemDto>(
            dtos,
            totalCount,
            request.Page,
            request.PageSize,
            totalPages);

        return Result<PagedResult<ItemDto>>.Success(pagedResult);
    }
}