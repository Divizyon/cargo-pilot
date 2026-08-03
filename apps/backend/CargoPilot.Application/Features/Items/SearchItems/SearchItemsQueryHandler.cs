using CargoPilot.Application.Abstractions;
using CargoPilot.Application.Common.Interfaces;
using CargoPilot.Application.Common.Models;
using FluentValidation;
using MediatR;

namespace CargoPilot.Application.Features.Items.SearchItems;

public sealed class SearchItemsQueryHandler : IRequestHandler<SearchItemsQuery, Result<PagedResult<ItemSummaryDto>>>
{
    private readonly IItemRepository _itemRepository;
    private readonly IIntegrationRepository _integrationRepository;
    private readonly ICurrentUserService _currentUserService;
    private readonly IValidator<SearchItemsQuery> _validator;

    public SearchItemsQueryHandler(
        IItemRepository itemRepository,
        IIntegrationRepository integrationRepository,
        ICurrentUserService currentUserService,
        IValidator<SearchItemsQuery> validator)
    {
        _itemRepository = itemRepository;
        _integrationRepository = integrationRepository;
        _currentUserService = currentUserService;
        _validator = validator;
    }

    public async Task<Result<PagedResult<ItemSummaryDto>>> Handle(
        SearchItemsQuery request,
        CancellationToken cancellationToken)
    {
        var validationResult = await _validator.ValidateAsync(request, cancellationToken);
        if (!validationResult.IsValid)
        {
            var failures = validationResult.Errors
                .Select(e => new ValidationFailure(e.PropertyName, e.ErrorMessage))
                .ToList();
            return Result<PagedResult<ItemSummaryDto>>.Failure(
                new Error(ErrorType.Validation, "Validation.Failed", "Doğrulama hatası.", failures));
        }

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
                i.ImageUrl,
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
