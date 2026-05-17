using CargoPilot.Application.Common.Models;
using MediatR;

namespace CargoPilot.Application.Features.Integrations.GetSyncLogs;

public sealed record GetSyncLogsQuery(Guid IntegrationId, int Page, int PageSize)
    : IRequest<Result<PagedResult<SyncLogDto>>>;
