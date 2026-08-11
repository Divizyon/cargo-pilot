using CargoPilot.Application.Abstractions;
using CargoPilot.Application.Common.Interfaces;
using CargoPilot.Application.Common.Items;
using CargoPilot.Application.Common.Models;
using CargoPilot.Domain.Enums;
using FluentValidation;
using MediatR;

namespace CargoPilot.Application.Features.DraftItems.ApproveDraftItem;

public sealed class ApproveDraftItemCommandHandler : IRequestHandler<ApproveDraftItemCommand, Result<Guid>>
{
    private readonly IDraftItemRepository _draftItemRepository;
    private readonly IItemRepository _itemRepository;
    private readonly ICurrentUserService _currentUserService;
    private readonly IValidator<ItemSpec> _specValidator;

    public ApproveDraftItemCommandHandler(
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

    public async Task<Result<Guid>> Handle(ApproveDraftItemCommand request, CancellationToken cancellationToken)
    {
        var companyId = _currentUserService.CompanyId;
        if (companyId is null)
            return Result<Guid>.Failure(new Error(ErrorType.Unauthorized, "Auth.Unauthorized", "Yetkisiz erişim."));

        var draft = await _draftItemRepository.GetByIdAsync(request.Id, companyId.Value, cancellationToken);
        if (draft is null)
            return Result<Guid>.Failure(new Error(ErrorType.NotFound, "DraftItem.NotFound", "Taslak ürün bulunamadı."));

        if (draft.Status == DraftItemStatus.Approved)
            return Result<Guid>.Failure(new Error(ErrorType.Conflict, "DraftItem.AlreadyApproved", "Bu taslak zaten onaylanmış."));

        var validation = await _specValidator.ValidateAsync(ItemSpec.FromDraft(draft), cancellationToken);
        if (!validation.IsValid)
        {
            return Result<Guid>.Failure(new Error(
                ErrorType.BusinessRule,
                "DraftItem.ValidationFailed",
                "Taslak ürün eksik veya hatalı alanlar içerdiği için onaylanamadı.",
                validation.Errors.Select(e => new ValidationFailure(e.PropertyName, e.ErrorMessage)).ToList()));
        }

        if (draft.Status == DraftItemStatus.UpdatePending)
        {
            var existingItem = await _itemRepository.GetByErpIdAsync(draft.ErpId, draft.IntegrationId, companyId.Value, cancellationToken);
            if (existingItem is null)
                return Result<Guid>.Failure(new Error(ErrorType.NotFound, "Item.NotFound", "Güncellenecek ürün bulunamadı."));

            ItemFactory.ApplyDraft(existingItem, draft);

            draft.Approve();

            _itemRepository.Update(existingItem);
            _draftItemRepository.Update(draft);
            await _draftItemRepository.SaveChangesAsync(cancellationToken);

            return Result<Guid>.Success(existingItem.Id);
        }

        var skuExists = await _itemRepository.ExistsBySkuAsync(draft.SKU, companyId.Value, cancellationToken);
        if (skuExists)
            return Result<Guid>.Failure(new Error(ErrorType.Conflict, "Item.SkuAlreadyExists", "Bu SKU ile kayıtlı bir ürün zaten mevcut."));

        var item = ItemFactory.CreateFromDraft(draft, companyId.Value);

        draft.Approve();

        _itemRepository.Add(item);
        _draftItemRepository.Update(draft);
        await _draftItemRepository.SaveChangesAsync(cancellationToken);

        return Result<Guid>.Success(item.Id);
    }
}
