using CargoPilot.Application.Abstractions;
using CargoPilot.Application.Common.Interfaces;
using CargoPilot.Application.Common.Models;
using FluentValidation;
using MediatR;

namespace CargoPilot.Application.Features.Items.SearchItems;

public sealed class SearchItemsQueryHandler : IRequestHandler<SearchItemsQuery, Result<PagedResult<ItemSummaryDto>>>
{
    private readonly IItemRepository _itemRepository;
    private readonly ICurrentUserService _currentUserService;
    private readonly IValidator<SearchItemsQuery> _validator;

    public SearchItemsQueryHandler(
        IItemRepository itemRepository,
        ICurrentUserService currentUserService,
        IValidator<SearchItemsQuery> validator)
    {
        _itemRepository = itemRepository;
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

        var pagedItems = await _itemRepository.SearchAsync(
            request.SearchTerm,
            request.Page,
            request.PageSize,
            _currentUserService.CompanyId,
            cancellationToken);

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
                i.ImageUrl)).ToList(),
            pagedItems.TotalCount,
            pagedItems.Page,
            pagedItems.PageSize);

        return Result<PagedResult<ItemSummaryDto>>.Success(dto);
    }
}
