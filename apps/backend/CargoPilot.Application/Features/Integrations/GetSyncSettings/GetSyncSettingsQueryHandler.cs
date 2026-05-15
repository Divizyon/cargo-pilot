using CargoPilot.Application.Abstractions;
using CargoPilot.Application.Common.Interfaces;
using CargoPilot.Application.Common.Models;
using MediatR;

namespace CargoPilot.Application.Features.Integrations.GetSyncSettings;

internal sealed class GetSyncSettingsQueryHandler : IRequestHandler<GetSyncSettingsQuery, Result<SyncSettingsResponse>>
{
    private readonly IIntegrationRepository _integrationRepository;
    private readonly ICurrentUserService _currentUserService;

    public GetSyncSettingsQueryHandler(
        IIntegrationRepository integrationRepository,
        ICurrentUserService currentUserService)
    {
        _integrationRepository = integrationRepository;
        _currentUserService = currentUserService;
    }

    public async Task<Result<SyncSettingsResponse>> Handle(GetSyncSettingsQuery request, CancellationToken cancellationToken)
    {
        var companyId = _currentUserService.CompanyId;

        var integration = await _integrationRepository.GetByIdAsync(request.IntegrationId, companyId, cancellationToken);

        if (integration is null)
            return Result<SyncSettingsResponse>.Failure(
                new Error(ErrorType.NotFound, "Integration.NotFound", "Entegrasyon bulunamadı."));

        return Result<SyncSettingsResponse>.Success(new SyncSettingsResponse(
            integration.Id,
            integration.SyncFrequency,
            integration.LastSyncDate,
            integration.NextScheduledSyncAt,
            integration.SyncStatus
        ));
    }
}
