using CargoPilot.Application.Abstractions;
using CargoPilot.Application.Common.Interfaces;
using CargoPilot.Application.Common.Models;
using MediatR;

namespace CargoPilot.Application.Features.Integrations.GetSyncLogs;

public sealed class GetSyncLogsQueryHandler : IRequestHandler<GetSyncLogsQuery, Result<PagedResult<SyncLogDto>>>
{
    private readonly IIntegrationRepository _integrationRepository;
    private readonly ICurrentUserService _currentUserService;

    public GetSyncLogsQueryHandler(
        IIntegrationRepository integrationRepository,
        ICurrentUserService currentUserService)
    {
        _integrationRepository = integrationRepository;
        _currentUserService = currentUserService;
    }

    public async Task<Result<PagedResult<SyncLogDto>>> Handle(GetSyncLogsQuery request, CancellationToken cancellationToken)
    {
        var companyId = _currentUserService.CompanyId;
        if (companyId is null)
            return Result<PagedResult<SyncLogDto>>.Failure(new Error(ErrorType.Unauthorized, "Auth.Unauthorized", "Yetkisiz erişim."));

        var integration = await _integrationRepository.GetByIdAsync(request.IntegrationId, companyId, cancellationToken);
        if (integration is null)
            return Result<PagedResult<SyncLogDto>>.Failure(new Error(ErrorType.NotFound, "Integration.NotFound", "Entegrasyon bulunamadı."));

        var pagedLogs = await _integrationRepository.ListSyncLogsAsync(
            request.IntegrationId, request.Page, request.PageSize, cancellationToken);

        var dtos = pagedLogs.Items.Select(l => new SyncLogDto(
            l.Id,
            l.StartedAt,
            l.CompletedAt,
            l.Status,
            l.SyncedRecordCount,
            l.ErrorMessage)).ToList();

        return Result<PagedResult<SyncLogDto>>.Success(
            new PagedResult<SyncLogDto>(dtos, pagedLogs.TotalCount, pagedLogs.Page, pagedLogs.PageSize));
    }
}
