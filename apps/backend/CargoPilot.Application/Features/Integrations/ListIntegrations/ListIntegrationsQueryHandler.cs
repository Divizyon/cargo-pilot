using CargoPilot.Application.Abstractions;
using CargoPilot.Application.Common.Interfaces;
using CargoPilot.Application.Common.Models;
using MediatR;

namespace CargoPilot.Application.Features.Integrations.ListIntegrations;

public sealed class ListIntegrationsQueryHandler : IRequestHandler<ListIntegrationsQuery, Result<IReadOnlyList<IntegrationSummary>>>
{
    private readonly IIntegrationRepository _integrationRepository;
    private readonly ICurrentUserService _currentUserService;

    public ListIntegrationsQueryHandler(
        IIntegrationRepository integrationRepository,
        ICurrentUserService currentUserService)
    {
        _integrationRepository = integrationRepository;
        _currentUserService = currentUserService;
    }

    public async Task<Result<IReadOnlyList<IntegrationSummary>>> Handle(
        ListIntegrationsQuery request,
        CancellationToken cancellationToken)
    {
        var companyId = _currentUserService.CompanyId;
        if (companyId is null)
            return Result<IReadOnlyList<IntegrationSummary>>.Failure(
                new Error(ErrorType.Unauthorized, "Auth.NoCompany", "Şirket bağlamı bulunamadı."));

        var integrations = await _integrationRepository.ListByCompanyAsync(companyId.Value, cancellationToken);

        var result = integrations
            .Select(i => new IntegrationSummary(i.Id, i.SystemName, i.ApiEndpoint))
            .ToList();

        return Result<IReadOnlyList<IntegrationSummary>>.Success(result);
    }
}
