using CargoPilot.Application.Abstractions;
using CargoPilot.Application.Common.Erp;
using CargoPilot.Application.Common.Interfaces;
using CargoPilot.Application.Common.Models;
using CargoPilot.Application.Features.Integrations.GetSyncSettings;
using CargoPilot.Application.Features.Integrations.SyncErpItems;
using MediatR;

namespace CargoPilot.Application.Features.Integrations.TriggerSync;

internal sealed class TriggerSyncCommandHandler : IRequestHandler<TriggerSyncCommand, Result<SyncSettingsResponse>>
{
    private readonly IIntegrationRepository _integrationRepository;
    private readonly ICurrentUserService _currentUserService;
    private readonly ISender _sender;

    public TriggerSyncCommandHandler(
        IIntegrationRepository integrationRepository,
        ICurrentUserService currentUserService,
        ISender sender)
    {
        _integrationRepository = integrationRepository;
        _currentUserService = currentUserService;
        _sender = sender;
    }

    public async Task<Result<SyncSettingsResponse>> Handle(TriggerSyncCommand request, CancellationToken cancellationToken)
    {
        var companyId = _currentUserService.CompanyId;
        if (companyId is null)
            return Result<SyncSettingsResponse>.Failure(
                new Error(ErrorType.Unauthorized, "Auth.NoCompany", "Şirket bağlamı bulunamadı."));

        // Şirket genelinde çalışan başka bir sync varsa engelle.
        var hasRunning = await _integrationRepository.HasAnyRunningSyncAsync(
            companyId.Value, ErpSyncPolicy.StaleThreshold(DateTime.UtcNow), cancellationToken);
        if (hasRunning)
            return Result<SyncSettingsResponse>.Failure(
                new Error(ErrorType.Conflict, "Sync.AlreadyRunning", "Şirket için senkronizasyon zaten çalışıyor."));

        var integration = await _integrationRepository.GetByIdAsync(request.IntegrationId, companyId.Value, cancellationToken);

        if (integration is null)
            return Result<SyncSettingsResponse>.Failure(
                new Error(ErrorType.NotFound, "Integration.NotFound", "Entegrasyon bulunamadı."));

        // Tek sync mantigi SyncErpItems'ta yasar; run-now yalnizca onu tetikler.
        var syncResult = await _sender.Send(
            new SyncErpItemsCommand(request.IntegrationId, CategoryFilter: null, WarehouseFilter: null),
            cancellationToken);

        if (!syncResult.IsSuccess)
            return Result<SyncSettingsResponse>.Failure(syncResult.Error!);

        return Result<SyncSettingsResponse>.Success(new SyncSettingsResponse(
            integration.Id,
            integration.SyncFrequency,
            integration.LastSyncDate,
            integration.NextScheduledSyncAt,
            integration.SyncStatus
        ));
    }
}
