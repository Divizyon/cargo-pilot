using CargoPilot.Application.Abstractions;
using CargoPilot.Application.Common.Interfaces;
using CargoPilot.Application.Common.Models;
using CargoPilot.Domain.Enums;
using MediatR;

namespace CargoPilot.Application.Features.DraftItems.ReinstateDraftItem;

/// <summary>
/// Ret kalici oldugu icin sync taslagi geri getirmez; geri alma yalnizca bu komutla yapilir.
/// </summary>
public sealed class ReinstateDraftItemCommandHandler : IRequestHandler<ReinstateDraftItemCommand, Result<Unit>>
{
    private readonly IDraftItemRepository _draftItemRepository;
    private readonly ICurrentUserService _currentUserService;

    public ReinstateDraftItemCommandHandler(
        IDraftItemRepository draftItemRepository,
        ICurrentUserService currentUserService)
    {
        _draftItemRepository = draftItemRepository;
        _currentUserService = currentUserService;
    }

    public async Task<Result<Unit>> Handle(ReinstateDraftItemCommand request, CancellationToken cancellationToken)
    {
        var companyId = _currentUserService.CompanyId;
        if (companyId is null)
            return Result<Unit>.Failure(new Error(ErrorType.Unauthorized, "Auth.Unauthorized", "Yetkisiz erişim."));

        var draft = await _draftItemRepository.GetByIdAsync(request.Id, companyId.Value, cancellationToken);
        if (draft is null)
            return Result<Unit>.Failure(new Error(ErrorType.NotFound, "DraftItem.NotFound", "Taslak ürün bulunamadı."));

        switch (draft.Status)
        {
            case DraftItemStatus.Rejected:
                draft.ResetToPending();
                break;
            case DraftItemStatus.UpdateDismissed:
                draft.RestoreUpdatePending();
                break;
            default:
                return Result<Unit>.Failure(new Error(
                    ErrorType.Conflict,
                    "DraftItem.NotRejected",
                    "Yalnızca reddedilmiş taslaklar tekrar beklemeye alınabilir."));
        }

        _draftItemRepository.Update(draft);
        await _draftItemRepository.SaveChangesAsync(cancellationToken);

        return Result<Unit>.Success(Unit.Value);
    }
}
