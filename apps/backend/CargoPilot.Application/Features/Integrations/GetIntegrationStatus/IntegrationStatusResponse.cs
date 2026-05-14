namespace CargoPilot.Application.Features.Integrations.GetIntegrationStatus;

public sealed record IntegrationStatusResponse(
    Guid IntegrationId,
    bool IsConnected);
