using CargoPilot.Application.Abstractions;
using CargoPilot.Application.Common.Interfaces;
using CargoPilot.Application.Common.Models;
using MediatR;

namespace CargoPilot.Application.Features.Integrations.GetIntegrationStatus;

internal sealed class GetIntegrationStatusQueryHandler
    : IRequestHandler<GetIntegrationStatusQuery, Result<IntegrationStatusResponse>>
{
    private readonly IIntegrationRepository _integrationRepository;
    private readonly ICurrentUserService _currentUserService;

    public GetIntegrationStatusQueryHandler(
        IIntegrationRepository integrationRepository,
        ICurrentUserService currentUserService)
    {
        _integrationRepository = integrationRepository;
        _currentUserService = currentUserService;
    }

    public async Task<Result<IntegrationStatusResponse>> Handle(
        GetIntegrationStatusQuery request,
        CancellationToken cancellationToken)
    {
        var companyId = _currentUserService.CompanyId;
        if (companyId is null)
            return Result<IntegrationStatusResponse>.Failure(
                new Error(ErrorType.Unauthorized, "Auth.NoCompany", "Şirket bağlamı bulunamadı."));

        var integration = await _integrationRepository.GetByIdAsync(
            request.IntegrationId, companyId.Value, cancellationToken);

        if (integration is null)
            return Result<IntegrationStatusResponse>.Failure(
                new Error(ErrorType.NotFound, "Integration.NotFound", "Entegrasyon bulunamadı."));

        return Result<IntegrationStatusResponse>.Success(
            new IntegrationStatusResponse(integration.Id, integration.IsActive));
    }
}
