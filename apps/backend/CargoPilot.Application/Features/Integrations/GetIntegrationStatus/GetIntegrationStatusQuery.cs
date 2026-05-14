using CargoPilot.Application.Common.Models;
using MediatR;

namespace CargoPilot.Application.Features.Integrations.GetIntegrationStatus;

public sealed record GetIntegrationStatusQuery(Guid IntegrationId) : IRequest<Result<IntegrationStatusResponse>>;
