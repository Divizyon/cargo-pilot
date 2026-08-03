using CargoPilot.Application.Common.Models;
using CargoPilot.Application.Features.Integrations.GetSyncSettings;
using MediatR;

namespace CargoPilot.Application.Features.Integrations.TriggerSync;

public record TriggerSyncCommand(Guid IntegrationId) : IRequest<Result<SyncSettingsResponse>>;
