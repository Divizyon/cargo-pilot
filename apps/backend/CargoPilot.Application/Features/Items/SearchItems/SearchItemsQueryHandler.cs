using CargoPilot.Application.Abstractions;
using CargoPilot.Application.Common.Interfaces;
using CargoPilot.Application.Common.Models;
using MediatR;

namespace CargoPilot.Application.Features.Items.SearchItems;

public sealed class SearchItemsQueryHandler : IRequestHandler<SearchItemsQuery, Result<PagedResult<ItemSummaryDto>>>
{
    private readonly IItemRepository _itemRepository;
    private readonly IIntegrationRepository _integrationRepository;
    private readonly ICurrentUserService _currentUserService;

    public SearchItemsQueryHandler(
        IItemRepository itemRepository,
        IIntegrationRepository integrationRepository,
        ICurrentUserService currentUserService)
    {
        _itemRepository = itemRepository;
        _integrationRepository = integrationRepository;
        _currentUserService = currentUserService;
    }

    public async Task<Result<PagedResult<ItemSummaryDto>>> Handle(
        SearchItemsQuery request,
        CancellationToken cancellationToken)
    {
        var companyId = _currentUserService.CompanyId;

        var pagedItems = await _itemRepository.SearchAsync(
            request.SearchTerm,
            request.Page,
            request.PageSize,
            companyId,
            cancellationToken);

        var integrations = companyId.HasValue
            ? await _integrationRepository.ListByCompanyAsync(companyId.Value, cancellationToken)
            : [];
        var integrationNames = integrations.ToDictionary(i => i.Id, i => i.SystemName);

        var dto = new PagedResult<ItemSummaryDto>(
            pagedItems.Items.Select(i => new ItemSummaryDto(
                i.Id,
                i.SKU,
                i.Barcode,
                i.Name,
                i.ProductType,
                i.Category,
                i.Width,
                i.Height,
                i.Length,
                i.Diameter,
                i.Weight,
                i.FragilityType,
                i.GetConstraintIds(),
                i.IsStackable,
                i.MaxStackCount,
                i.MaxWeightOnTop,
                i.AllowedRotations,
                i.StackGroup,
                i.GetIncompatibleGroups(),
                i.SpecialNotes,
                i.IntegrationId.HasValue ? integrationNames.GetValueOrDefault(i.IntegrationId.Value) : null)).ToList(),
            pagedItems.TotalCount,
            pagedItems.Page,
            pagedItems.PageSize);

        return Result<PagedResult<ItemSummaryDto>>.Success(dto);
    }
}
