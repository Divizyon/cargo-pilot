using CargoPilot.Application.Abstractions;
using CargoPilot.Application.Common.Interfaces;
using CargoPilot.Application.Common.Models;
using MediatR;

namespace CargoPilot.Application.Features.DraftItems.GetDraftItems;

public sealed class GetDraftItemsQueryHandler : IRequestHandler<GetDraftItemsQuery, Result<GetDraftItemsResult>>
{
    private readonly IDraftItemRepository _draftItemRepository;
    private readonly ICurrentUserService _currentUserService;

    public GetDraftItemsQueryHandler(IDraftItemRepository draftItemRepository, ICurrentUserService currentUserService)
    {
        _draftItemRepository = draftItemRepository;
        _currentUserService = currentUserService;
    }

    public async Task<Result<GetDraftItemsResult>> Handle(GetDraftItemsQuery request, CancellationToken cancellationToken)
    {
        var companyId = _currentUserService.CompanyId;
        if (companyId is null)
            return Result<GetDraftItemsResult>.Failure(new Error(ErrorType.Unauthorized, "Auth.Unauthorized", "Yetkisiz erişim."));

        var (items, totalCount) = await _draftItemRepository.ListByCompanyAsync(
            companyId.Value, request.Status, request.Page, request.PageSize, cancellationToken);

        var dtos = items.Select(x => new DraftItemDto(
            x.Id,
            x.ErpId,
            x.Status,
            x.SKU,
            x.Barcode,
            x.Name,
            x.ProductType,
            x.Category,
            x.Width,
            x.Height,
            x.Length,
            x.Diameter,
            x.Weight,
            x.FragilityType,
            x.IsStackable,
            x.MaxStackCount,
            x.MaxWeightOnTop,
            x.AllowedRotations,
            x.ImageUrl,
            x.StackGroup,
            x.SpecialNotes,
            x.GetConstraintIds(),
            x.CreatedAtUtc))
            .ToList();

        return Result<GetDraftItemsResult>.Success(new GetDraftItemsResult(dtos, totalCount, request.Page, request.PageSize));
    }
}
