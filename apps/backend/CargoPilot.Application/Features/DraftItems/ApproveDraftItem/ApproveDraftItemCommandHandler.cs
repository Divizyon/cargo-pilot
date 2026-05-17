using CargoPilot.Application.Abstractions;
using CargoPilot.Application.Common.Interfaces;
using CargoPilot.Application.Common.Models;
using CargoPilot.Domain.Entities;
using CargoPilot.Domain.Enums;
using MediatR;

namespace CargoPilot.Application.Features.DraftItems.ApproveDraftItem;

public sealed class ApproveDraftItemCommandHandler : IRequestHandler<ApproveDraftItemCommand, Result<Guid>>
{
    private readonly IDraftItemRepository _draftItemRepository;
    private readonly IItemRepository _itemRepository;
    private readonly ICurrentUserService _currentUserService;

    public ApproveDraftItemCommandHandler(
        IDraftItemRepository draftItemRepository,
        IItemRepository itemRepository,
        ICurrentUserService currentUserService)
    {
        _draftItemRepository = draftItemRepository;
        _itemRepository = itemRepository;
        _currentUserService = currentUserService;
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

        if (draft.Status == DraftItemStatus.UpdatePending)
        {
            var existingItem = await _itemRepository.GetByErpIdAsync(draft.ErpId, draft.IntegrationId, companyId.Value, cancellationToken);
            if (existingItem is null)
                return Result<Guid>.Failure(new Error(ErrorType.NotFound, "Item.NotFound", "Güncellenecek ürün bulunamadı."));

            existingItem.Update(draft.SKU, draft.Barcode, draft.Name, draft.ProductType, draft.Category,
                draft.Width, draft.Height, draft.Length, draft.Diameter, draft.Weight, draft.FragilityType,
                draft.IsStackable, draft.MaxStackCount, draft.MaxWeightOnTop, draft.AllowedRotations,
                draft.ImageUrl, draft.StackGroup, null, draft.SpecialNotes, draft.GetConstraintIds());

            draft.Approve();

            _itemRepository.Update(existingItem);
            _draftItemRepository.Update(draft);
            await _draftItemRepository.SaveChangesAsync(cancellationToken);

            return Result<Guid>.Success(existingItem.Id);
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
            draft.SpecialNotes,
            draft.GetConstraintIds(),
            companyId);

        item.SetErpSource(draft.ErpId, draft.IntegrationId);
        item.SetRuleAssigned(true);

        draft.Approve();

        _itemRepository.Add(item);
        _draftItemRepository.Update(draft);
        await _draftItemRepository.SaveChangesAsync(cancellationToken);

        return Result<Guid>.Success(item.Id);
    }
}
