using CargoPilot.Application.Abstractions;
using CargoPilot.Application.Common.Interfaces;
using CargoPilot.Application.Common.Models;
using MediatR;

namespace CargoPilot.Application.Features.Items.GetItemById;

public sealed class GetItemByIdQueryHandler : IRequestHandler<GetItemByIdQuery, Result<ItemDetailDto>>
{
    private readonly IItemRepository _itemRepository;
    private readonly ICurrentUserService _currentUserService;

    public GetItemByIdQueryHandler(
        IItemRepository itemRepository,
        ICurrentUserService currentUserService)
    {
        _itemRepository = itemRepository;
        _currentUserService = currentUserService;
    }

    public async Task<Result<ItemDetailDto>> Handle(GetItemByIdQuery request, CancellationToken cancellationToken)
    {
        var item = await _itemRepository.GetByIdAsync(request.Id, _currentUserService.CompanyId, cancellationToken);
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
            item.GetConstraintIds(),
            item.IsStackable,
            item.MaxStackCount,
            item.MaxWeightOnTop,
            item.AllowedRotations,
            item.ImageUrl,
            item.StackGroup,
            item.SpecialNotes);

        return Result<ItemDetailDto>.Success(dto);
    }
}
