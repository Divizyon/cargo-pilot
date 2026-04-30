using CargoPilot.Application.Common.Interfaces;
using CargoPilot.Application.Common.Models;
using MediatR;

namespace CargoPilot.Application.Features.Items.DeleteItem;

public sealed class DeleteItemCommandHandler : IRequestHandler<DeleteItemCommand, Result<Guid>>
{
    private readonly IItemRepository _itemRepository;

    public DeleteItemCommandHandler(IItemRepository itemRepository)
    {
        _itemRepository = itemRepository;
    }

    public async Task<Result<Guid>> Handle(DeleteItemCommand request, CancellationToken cancellationToken)
    {
        var item = await _itemRepository.GetByIdAsync(request.Id, cancellationToken);
        if (item is null)
        {
            return Result<Guid>.Failure(
                new Error(ErrorType.NotFound, "Item.NotFound", "Ürün bulunamadı."));
        }

        var isUsedInActivePlan = await _itemRepository.IsUsedInActiveLoadingPlanAsync(request.Id, cancellationToken);
        if (isUsedInActivePlan)
        {
            return Result<Guid>.Failure(
                new Error(ErrorType.Conflict, "Item.UsedInActiveLoadingPlan",
                    "Bu ürün aktif bir sevkiyat planında kullanıldığı için silinemez."));
        }

        item.MarkAsDeleted();
        await _itemRepository.SaveChangesAsync(cancellationToken);

        return Result<Guid>.Success(item.Id);
    }
}
