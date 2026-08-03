using CargoPilot.Application.Common.Models;
using MediatR;

namespace CargoPilot.Application.Features.Integrations.ListIntegrations;

public record ListIntegrationsQuery : IRequest<Result<IReadOnlyList<IntegrationSummary>>>;

public record IntegrationSummary(Guid Id, string SystemName, string ApiEndpoint);
