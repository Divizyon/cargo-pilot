using CargoPilot.Application.Abstractions;
using CargoPilot.Application.Common.Interfaces;
using CargoPilot.Application.Common.Models;
using CargoPilot.Domain.Enums;
using MediatR;

namespace CargoPilot.Application.Features.DraftItems.RejectDraftItem;

public sealed class RejectDraftItemCommandHandler : IRequestHandler<RejectDraftItemCommand, Result<Unit>>
{
    private readonly IDraftItemRepository _draftItemRepository;
    private readonly ICurrentUserService _currentUserService;

    public RejectDraftItemCommandHandler(IDraftItemRepository draftItemRepository, ICurrentUserService currentUserService)
    {
        _draftItemRepository = draftItemRepository;
        _currentUserService = currentUserService;
    }

    public async Task<Result<Unit>> Handle(RejectDraftItemCommand request, CancellationToken cancellationToken)
    {
        var companyId = _currentUserService.CompanyId;
        if (companyId is null)
            return Result<Unit>.Failure(new Error(ErrorType.Unauthorized, "Auth.Unauthorized", "Yetkisiz erişim."));

        var draft = await _draftItemRepository.GetByIdAsync(request.Id, companyId.Value, cancellationToken);
        if (draft is null)
            return Result<Unit>.Failure(new Error(ErrorType.NotFound, "DraftItem.NotFound", "Taslak ürün bulunamadı."));

        if (draft.Status == DraftItemStatus.Approved)
            return Result<Unit>.Failure(new Error(ErrorType.Conflict, "DraftItem.AlreadyApproved", "Onaylanmış taslak reddedilemez."));

        draft.Reject();
        _draftItemRepository.Update(draft);
        await _draftItemRepository.SaveChangesAsync(cancellationToken);

        return Result<Unit>.Success(Unit.Value);
    }
}
