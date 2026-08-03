using CargoPilot.Application.Abstractions;
using CargoPilot.Application.Common.Interfaces;
using CargoPilot.Application.Common.Models;
using MediatR;

namespace CargoPilot.Application.Features.Items.GetItemById;

public sealed class GetItemByIdQueryHandler : IRequestHandler<GetItemByIdQuery, Result<ItemDetailDto>>
{
    private readonly IItemRepository _itemRepository;
    private readonly IIntegrationRepository _integrationRepository;
    private readonly ICurrentUserService _currentUserService;

    public GetItemByIdQueryHandler(
        IItemRepository itemRepository,
        IIntegrationRepository integrationRepository,
        ICurrentUserService currentUserService)
    {
        _itemRepository = itemRepository;
        _integrationRepository = integrationRepository;
        _currentUserService = currentUserService;
    }

    public async Task<Result<ItemDetailDto>> Handle(GetItemByIdQuery request, CancellationToken cancellationToken)
    {
        var companyId = _currentUserService.CompanyId;
        var item = await _itemRepository.GetByIdAsync(request.Id, companyId, cancellationToken);
        if (item is null)
        {
            return Result<ItemDetailDto>.Failure(
                new Error(ErrorType.NotFound, "Item.NotFound", "Ürün bulunamadı."));
        }

        string? erpProviderName = null;
        if (item.IntegrationId.HasValue && companyId.HasValue)
        {
            var integration = await _integrationRepository.GetByIdAsync(item.IntegrationId.Value, companyId.Value, cancellationToken);
            erpProviderName = integration?.SystemName;
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
            item.GetIncompatibleGroups(),
            item.SpecialNotes,
            erpProviderName);

        return Result<ItemDetailDto>.Success(dto);
    }
}
