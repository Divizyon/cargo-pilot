using CargoPilot.Application.Abstractions;
using CargoPilot.Application.Common.Interfaces;
using CargoPilot.Application.Common.Models;
using CargoPilot.Domain.Entities;
using CargoPilot.Domain.Enums;
using MediatR;

namespace CargoPilot.Application.Features.DraftItems.ApproveDraftItems;

public sealed class ApproveDraftItemsCommandHandler : IRequestHandler<ApproveDraftItemsCommand, Result<ApproveDraftItemsResult>>
{
    private readonly IDraftItemRepository _draftItemRepository;
    private readonly IItemRepository _itemRepository;
    private readonly ICurrentUserService _currentUserService;

    public ApproveDraftItemsCommandHandler(
        IDraftItemRepository draftItemRepository,
        IItemRepository itemRepository,
        ICurrentUserService currentUserService)
    {
        _draftItemRepository = draftItemRepository;
        _itemRepository = itemRepository;
        _currentUserService = currentUserService;
    }

    public async Task<Result<ApproveDraftItemsResult>> Handle(ApproveDraftItemsCommand request, CancellationToken cancellationToken)
    {
        var companyId = _currentUserService.CompanyId;
        if (companyId is null)
            return Result<ApproveDraftItemsResult>.Failure(new Error(ErrorType.Unauthorized, "Auth.Unauthorized", "Yetkisiz erişim."));

        var drafts = await _draftItemRepository.GetByIdsAsync(request.Ids, companyId.Value, cancellationToken);

        int approved = 0, skipped = 0;

        foreach (var draft in drafts)
        {
            if (draft.Status == DraftItemStatus.Approved)
            {
                skipped++;
                continue;
            }

            if (draft.Status == DraftItemStatus.UpdatePending)
            {
                var existingItem = await _itemRepository.GetByErpIdAsync(draft.ErpId, draft.IntegrationId, companyId.Value, cancellationToken);
                if (existingItem is null)
                {
                    skipped++;
                    continue;
                }

                existingItem.Update(draft.SKU, draft.Barcode, draft.Name, draft.ProductType, draft.Category,
                    draft.Width, draft.Height, draft.Length, draft.Diameter, draft.Weight, draft.FragilityType,
                    draft.IsStackable, draft.MaxStackCount, draft.MaxWeightOnTop, draft.AllowedRotations,
                    draft.ImageUrl, draft.StackGroup, null, draft.SpecialNotes, draft.GetConstraintIds());

                draft.Approve();

                _itemRepository.Update(existingItem);
                _draftItemRepository.Update(draft);
                approved++;
                continue;
            }

            var skuExists = await _itemRepository.ExistsBySkuAsync(draft.SKU, companyId.Value, cancellationToken);
            if (skuExists)
            {
                skipped++;
                continue;
            }

            var item = new Item(
                Guid.NewGuid(),
                draft.SKU,
                draft.Name,
                draft.ProductType,
                draft.Category,
                draft.Width,
                draft.Height,
                draft.Length,
                draft.Weight,
                draft.FragilityType,
                draft.IsStackable,
                draft.MaxStackCount,
                draft.MaxWeightOnTop,
                draft.AllowedRotations,
                draft.Barcode,
                draft.Diameter,
                draft.ImageUrl,
                draft.StackGroup,
                null,
                draft.SpecialNotes,
                draft.GetConstraintIds(),
                companyId);

            item.SetErpSource(draft.ErpId, draft.IntegrationId);
            item.SetRuleAssigned(true);

            draft.Approve();

            _itemRepository.Add(item);
            _draftItemRepository.Update(draft);
            approved++;
        }

        await _draftItemRepository.SaveChangesAsync(cancellationToken);

        return Result<ApproveDraftItemsResult>.Success(new ApproveDraftItemsResult(approved, skipped));
    }
}
