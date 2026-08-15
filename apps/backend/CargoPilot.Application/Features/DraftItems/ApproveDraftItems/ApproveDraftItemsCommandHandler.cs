using CargoPilot.Application.Abstractions;
using CargoPilot.Application.Common.Interfaces;
using CargoPilot.Application.Common.Items;
using CargoPilot.Application.Common.Models;
using CargoPilot.Domain.Entities;
using CargoPilot.Domain.Enums;
using FluentValidation;
using MediatR;

namespace CargoPilot.Application.Features.DraftItems.ApproveDraftItems;

public sealed class ApproveDraftItemsCommandHandler : IRequestHandler<ApproveDraftItemsCommand, Result<ApproveDraftItemsResult>>
{
    private readonly IDraftItemRepository _draftItemRepository;
    private readonly IItemRepository _itemRepository;
    private readonly ICurrentUserService _currentUserService;
    private readonly IValidator<ItemSpec> _specValidator;

    public ApproveDraftItemsCommandHandler(
        IDraftItemRepository draftItemRepository,
        IItemRepository itemRepository,
        ICurrentUserService currentUserService,
        IValidator<ItemSpec> specValidator)
    {
        _draftItemRepository = draftItemRepository;
        _itemRepository = itemRepository;
        _currentUserService = currentUserService;
        _specValidator = specValidator;
    }

    public async Task<Result<ApproveDraftItemsResult>> Handle(ApproveDraftItemsCommand request, CancellationToken cancellationToken)
    {
        var companyId = _currentUserService.CompanyId;
        if (companyId is null)
            return Result<ApproveDraftItemsResult>.Failure(new Error(ErrorType.Unauthorized, "Auth.Unauthorized", "Yetkisiz erişim."));

        var drafts = await _draftItemRepository.GetByIdsAsync(request.Ids, companyId.Value, cancellationToken);

        int approved = 0;
        var skippedItems = new List<SkippedDraftItem>();

        foreach (var draft in drafts)
        {
            if (draft.Status == DraftItemStatus.Approved)
            {
                skippedItems.Add(Skip(draft, "Bu taslak zaten onaylanmış."));
                continue;
            }

            var validation = await _specValidator.ValidateAsync(ItemSpec.FromDraft(draft), cancellationToken);
            if (!validation.IsValid)
            {
                skippedItems.Add(Skip(draft, string.Join(" ", validation.Errors.Select(e => e.ErrorMessage).Distinct())));
                continue;
            }

            if (draft.Status == DraftItemStatus.UpdatePending)
            {
                var existingItem = await _itemRepository.GetByErpIdAsync(draft.ErpId, draft.IntegrationId, companyId.Value, cancellationToken);
                if (existingItem is null)
                {
                    skippedItems.Add(Skip(draft, "Güncellenecek ürün bulunamadı."));
                    continue;
                }

                ItemFactory.ApplyDraft(existingItem, draft);

                draft.Approve();

                _itemRepository.Update(existingItem);
                _draftItemRepository.Update(draft);
                approved++;
                continue;
            }

            var skuExists = await _itemRepository.ExistsBySkuAsync(draft.SKU, companyId.Value, cancellationToken);
            if (skuExists)
            {
                skippedItems.Add(Skip(draft, "Bu SKU ile kayıtlı bir ürün zaten mevcut."));
                continue;
            }

            var item = ItemFactory.CreateFromDraft(draft, companyId.Value);

            draft.Approve();

            _itemRepository.Add(item);
            _draftItemRepository.Update(draft);
            approved++;
        }

        await _draftItemRepository.SaveChangesAsync(cancellationToken);

        return Result<ApproveDraftItemsResult>.Success(
            new ApproveDraftItemsResult(approved, skippedItems.Count, skippedItems));
    }

    private static SkippedDraftItem Skip(DraftItem draft, string reason) =>
        new(draft.Id, draft.SKU, reason);
}
