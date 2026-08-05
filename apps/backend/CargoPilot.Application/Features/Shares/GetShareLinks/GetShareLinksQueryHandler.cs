using CargoPilot.Application.Abstractions;
using CargoPilot.Application.Common.Interfaces;
using CargoPilot.Application.Common.Models;
using CargoPilot.Application.Features.Shares.CreateShareLink;
using MediatR;

namespace CargoPilot.Application.Features.Shares.GetShareLinks;

internal sealed class GetShareLinksQueryHandler
    : IRequestHandler<GetShareLinksQuery, Result<IReadOnlyList<ShareLinkDto>>>
{
    private readonly IShareLinkRepository _repository;
    private readonly ICurrentUserService _currentUserService;

    public GetShareLinksQueryHandler(
        IShareLinkRepository repository,
        ICurrentUserService currentUserService)
    {
        _repository = repository;
        _currentUserService = currentUserService;
    }

    public async Task<Result<IReadOnlyList<ShareLinkDto>>> Handle(
        GetShareLinksQuery request,
        CancellationToken cancellationToken)
    {
        if (_currentUserService.UserId is null)
            return Result<IReadOnlyList<ShareLinkDto>>.Failure(
                new Error(ErrorType.Unauthorized, "AUTH_UNAUTHORIZED", "Kimlik doğrulaması gereklidir."));

        var links = await _repository.ListByCompanyAsync(_currentUserService.CompanyId, cancellationToken);
        return Result<IReadOnlyList<ShareLinkDto>>.Success(links);
    }
}
