using CargoPilot.Application.Abstractions;
using CargoPilot.Application.Common.Interfaces;
using CargoPilot.Application.Common.Models;
using CargoPilot.Application.Features.Integrations.GetSyncSettings;
using CargoPilot.Domain.Enums;
using MediatR;

namespace CargoPilot.Application.Features.Integrations.TriggerSync;

public sealed class TriggerSyncCommandHandler : IRequestHandler<TriggerSyncCommand, Result<SyncSettingsResponse>>
{
    private readonly IIntegrationRepository _integrationRepository;
    private readonly ICurrentUserService _currentUserService;

    public TriggerSyncCommandHandler(
        IIntegrationRepository integrationRepository,
        ICurrentUserService currentUserService)
    {
        _integrationRepository = integrationRepository;
        _currentUserService = currentUserService;
    }

    public async Task<Result<SyncSettingsResponse>> Handle(TriggerSyncCommand request, CancellationToken cancellationToken)
    {
        var companyId = _currentUserService.CompanyId;
        if (companyId is null)
            return Result<SyncSettingsResponse>.Failure(
                new Error(ErrorType.Unauthorized, "Auth.NoCompany", "Şirket bağlamı bulunamadı."));

        // Şirket genelinde çalışan başka bir sync varsa engelle.
        var hasRunning = await _integrationRepository.HasAnyRunningSyncAsync(companyId.Value, cancellationToken);
        if (hasRunning)
            return Result<SyncSettingsResponse>.Failure(
                new Error(ErrorType.Conflict, "Sync.AlreadyRunning", "Şirket için senkronizasyon zaten çalışıyor."));

        var integration = await _integrationRepository.GetByIdAsync(request.IntegrationId, companyId.Value, cancellationToken);

        if (integration is null)
            return Result<SyncSettingsResponse>.Failure(
                new Error(ErrorType.NotFound, "Integration.NotFound", "Entegrasyon bulunamadı."));

        integration.StartSync();
        await _integrationRepository.SaveChangesAsync(cancellationToken);

        try
        {
            await ExecuteSyncAsync();

            var now = DateTime.UtcNow;
            DateTime? nextScheduledSyncAt = integration.SyncFrequency.HasValue
                ? now.Add(integration.SyncFrequency.Value.ToTimeSpan())
                : null;

            integration.CompleteSync(now, nextScheduledSyncAt);
        }
        catch (Exception)
        {
            integration.FailSync();
        }

        await _integrationRepository.SaveChangesAsync(cancellationToken);

        return Result<SyncSettingsResponse>.Success(new SyncSettingsResponse(
            integration.Id,
            integration.SyncFrequency,
            integration.LastSyncDate,
            integration.NextScheduledSyncAt,
            integration.SyncStatus
        ));
    }

    private static Task ExecuteSyncAsync() => Task.CompletedTask;
}
