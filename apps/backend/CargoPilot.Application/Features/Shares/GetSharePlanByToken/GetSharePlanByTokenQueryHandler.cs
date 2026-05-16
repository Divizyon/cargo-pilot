using CargoPilot.Application.Common.Interfaces;
using CargoPilot.Application.Common.Models;
using MediatR;

namespace CargoPilot.Application.Features.Shares.GetSharePlanByToken;

internal sealed class GetSharePlanByTokenQueryHandler : IRequestHandler<GetSharePlanByTokenQuery, Result<SharePlanDto>>
{
    private readonly IShareLinkRepository _repository;

    public GetSharePlanByTokenQueryHandler(IShareLinkRepository repository)
    {
        _repository = repository;
    }

    public async Task<Result<SharePlanDto>> Handle(GetSharePlanByTokenQuery request, CancellationToken cancellationToken)
    {
        var dto = await _repository.GetSharePlanByTokenAsync(request.Token, cancellationToken);

        if (dto is null)
            return Result<SharePlanDto>.Failure(
                new Error(ErrorType.NotFound, "Share.NotFound", "Paylaşım bağlantısı bulunamadı."));

        return Result<SharePlanDto>.Success(dto);
    }
}
