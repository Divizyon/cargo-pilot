using CargoPilot.Application.Common.Models;
using MediatR;

namespace CargoPilot.Application.Features.Integrations.GetSyncSettings;

public record GetSyncSettingsQuery(Guid IntegrationId) : IRequest<Result<SyncSettingsResponse>>;
