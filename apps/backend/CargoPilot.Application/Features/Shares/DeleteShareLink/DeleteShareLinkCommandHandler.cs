using CargoPilot.Application.Abstractions;
using CargoPilot.Application.Common.Interfaces;
using CargoPilot.Application.Common.Models;
using MediatR;

namespace CargoPilot.Application.Features.Shares.DeleteShareLink;

internal sealed class DeleteShareLinkCommandHandler : IRequestHandler<DeleteShareLinkCommand, Result<bool>>
{
    private readonly IShareLinkRepository _repository;
    private readonly ICurrentUserService _currentUserService;

    public DeleteShareLinkCommandHandler(
        IShareLinkRepository repository,
        ICurrentUserService currentUserService)
    {
        _repository = repository;
        _currentUserService = currentUserService;
    }

    public async Task<Result<bool>> Handle(DeleteShareLinkCommand request, CancellationToken cancellationToken)
    {
        if (_currentUserService.UserId is null)
            return Result<bool>.Failure(
                new Error(ErrorType.Unauthorized, "AUTH_UNAUTHORIZED", "Kimlik doğrulaması gereklidir."));

        // Başka şirketin bağlantısı için de NotFound döner; varlığı sızdırılmaz.
        var shareLink = await _repository.GetOwnedByCompanyAsync(
            request.Id, _currentUserService.CompanyId, cancellationToken);

        if (shareLink is null)
            return Result<bool>.Failure(
                new Error(ErrorType.NotFound, "Share.NotFound", "Paylaşım bağlantısı bulunamadı."));

        // ShareLink soft delete taşımaz; iptal kaydın silinmesiyle yapılır.
        _repository.Remove(shareLink);
        await _repository.SaveChangesAsync(cancellationToken);

        return Result<bool>.Success(true);
    }
}
