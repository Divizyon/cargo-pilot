using CargoPilot.Application.Common.Models;
using CargoPilot.Application.Features.Integrations.GetSyncSettings;
using CargoPilot.Domain.Enums;
using MediatR;
using System.Text.Json.Serialization;

namespace CargoPilot.Application.Features.Integrations.UpdateSyncSettings;

public record UpdateSyncSettingsCommand(
    [property: JsonIgnore] Guid IntegrationId,
    SyncFrequency? SyncFrequency
) : IRequest<Result<SyncSettingsResponse>>;
