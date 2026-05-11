using CargoPilot.Application.Common.Models;
using CargoPilot.Application.Features.Integrations.GetSyncSettings;
using CargoPilot.Domain.Enums;
using MediatR;

namespace CargoPilot.Application.Features.Integrations.UpdateSyncSettings;

public record UpdateSyncSettingsCommand(
    Guid IntegrationId,
    SyncFrequency? SyncFrequency
) : IRequest<Result<SyncSettingsResponse>>;
