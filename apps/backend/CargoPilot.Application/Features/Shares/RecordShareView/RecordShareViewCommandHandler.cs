using CargoPilot.Application.Common.Interfaces;
using CargoPilot.Application.Common.Models;
using MediatR;

namespace CargoPilot.Application.Features.Shares.RecordShareView;

internal sealed class RecordShareViewCommandHandler : IRequestHandler<RecordShareViewCommand, Result<bool>>
{
    private readonly IShareLinkRepository _repository;

    public RecordShareViewCommandHandler(IShareLinkRepository repository)
    {
        _repository = repository;
    }

    public async Task<Result<bool>> Handle(RecordShareViewCommand request, CancellationToken cancellationToken)
    {
        var shareLink = await _repository.GetByTokenAsync(request.Token, cancellationToken);

        if (shareLink is not null && !shareLink.IsExpired)
        {
            shareLink.IncrementViewCount();
            await _repository.SaveChangesAsync(cancellationToken);
        }

        return Result<bool>.Success(true);
    }
}
