using CargoPilot.Application.Abstractions;
using CargoPilot.Application.Common.Interfaces;
using CargoPilot.Application.Common.Models;
using CargoPilot.Domain.Enums;
using MediatR;

namespace CargoPilot.Application.Features.Subscriptions.GetCurrentSubscription;

internal sealed class GetCurrentSubscriptionQueryHandler
    : IRequestHandler<GetCurrentSubscriptionQuery, Result<CurrentSubscriptionDto>>
{
    private readonly ICompanyRepository _companyRepository;
    private readonly ICurrentUserService _currentUserService;

    public GetCurrentSubscriptionQueryHandler(
        ICompanyRepository companyRepository,
        ICurrentUserService currentUserService)
    {
        _companyRepository = companyRepository;
        _currentUserService = currentUserService;
    }

    public async Task<Result<CurrentSubscriptionDto>> Handle(
        GetCurrentSubscriptionQuery request,
        CancellationToken cancellationToken)
    {
        if (_currentUserService.CompanyId is not { } companyId)
            return Result<CurrentSubscriptionDto>.Failure(
                new Error(ErrorType.Unauthorized, "AUTH_UNAUTHORIZED", "Kimlik doğrulaması gereklidir."));

        var company = await _companyRepository.GetByIdAsync(companyId, cancellationToken);
        if (company is null)
            return Result<CurrentSubscriptionDto>.Failure(
                new Error(ErrorType.NotFound, "Company.NotFound", "Firma bulunamadı."));

        var displayName = company.SubscriptionType switch
        {
            SubscriptionType.Free       => "Başlangıç",
            SubscriptionType.Pro        => "Büyüme",
            SubscriptionType.Enterprise => "Kurumsal",
            _                           => company.SubscriptionType.ToString()
        };

        return Result<CurrentSubscriptionDto>.Success(
            new CurrentSubscriptionDto(company.SubscriptionType.ToString(), displayName));
    }
}
