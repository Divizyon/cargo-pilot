using CargoPilot.Application.Common.Interfaces;
using CargoPilot.Application.Common.Models;
using MediatR;

namespace CargoPilot.Application.Features.Items.GetItemById;

public sealed class GetItemByIdQueryHandler : IRequestHandler<GetItemByIdQuery, Result<ItemDetailDto>>
{
    private readonly IItemRepository _itemRepository;

    public GetItemByIdQueryHandler(IItemRepository itemRepository)
    {
        _itemRepository = itemRepository;
    }

    public async Task<Result<ItemDetailDto>> Handle(GetItemByIdQuery request, CancellationToken cancellationToken)
    {
        var item = await _itemRepository.GetByIdAsync(request.Id, cancellationToken);
        if (item is null)
        {
            return Result<ItemDetailDto>.Failure(
                new Error(ErrorType.NotFound, "Item.NotFound", "Ürün bulunamadı."));
        }

        var dto = new ItemDetailDto(
            item.Id,
            item.SKU,
            item.Barcode,
            item.Name,
            item.ProductType,
            item.Category,
            item.Width,
            item.Height,
            item.Length,
            item.Diameter,
            item.Weight,
            item.FragilityType,
            item.IsStackable,
            item.MaxStackCount,
            item.MaxWeightOnTop,
            item.AllowedRotations,
            item.ImageUrl,
            item.StackGroup,
            item.IncompatibleGroups,
            item.SpecialNotes);

        return Result<ItemDetailDto>.Success(dto);
    }
}
