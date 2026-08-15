using System.Text.Json;
using CargoPilot.Application.Abstractions;
using CargoPilot.Application.Common.Erp;
using CargoPilot.Application.Common.Interfaces;
using CargoPilot.Application.Common.Models;
using MediatR;

namespace CargoPilot.Application.Features.Integrations.GetSyncLogs;

public sealed class GetSyncLogsQueryHandler : IRequestHandler<GetSyncLogsQuery, Result<SyncLogPageDto>>
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

    public async Task<Result<SyncLogPageDto>> Handle(GetSyncLogsQuery request, CancellationToken cancellationToken)
    {
        var companyId = _currentUserService.CompanyId;
        if (companyId is null)
            return Result<SyncLogPageDto>.Failure(new Error(ErrorType.Unauthorized, "Auth.Unauthorized", "Yetkisiz erişim."));

        var integration = await _integrationRepository.GetByIdAsync(request.IntegrationId, companyId, cancellationToken);
        if (integration is null)
            return Result<SyncLogPageDto>.Failure(new Error(ErrorType.NotFound, "Integration.NotFound", "Entegrasyon bulunamadı."));

        var pagedLogs = await _integrationRepository.ListSyncLogsAsync(
            request.IntegrationId, request.Page, request.PageSize, cancellationToken);

        var dtos = pagedLogs.Items.Select(l => new SyncLogDto(
            l.Id,
            l.StartedAt,
            l.CompletedAt,
            l.Status,
            l.SyncedRecordCount,
            l.ErrorMessage,
            ParseRowErrors(l.RowErrorsJson),
            l.SourceTotal,
            l.FetchedCount,
            ParseDroppedByReason(l.DroppedByReasonJson),
            l.UnchangedCount,
            l.UnaccountedCount)).ToList();

        var failedCount = await _integrationRepository.CountFailedSyncLogsAsync(
            request.IntegrationId, cancellationToken);

        return Result<SyncLogPageDto>.Success(
            new SyncLogPageDto(dtos, pagedLogs.TotalCount, pagedLogs.Page, pagedLogs.PageSize, failedCount));
    }

    private static Dictionary<string, int> ParseDroppedByReason(string? droppedByReasonJson)
    {
        if (string.IsNullOrWhiteSpace(droppedByReasonJson))
            return [];

        try
        {
            return JsonSerializer.Deserialize<Dictionary<string, int>>(droppedByReasonJson) ?? [];
        }
        catch (JsonException)
        {
            return [];
        }
    }

    private static List<SyncRowError> ParseRowErrors(string? rowErrorsJson)
    {
        if (string.IsNullOrWhiteSpace(rowErrorsJson))
            return [];

        try
        {
            return JsonSerializer.Deserialize<List<SyncRowError>>(rowErrorsJson) ?? [];
        }
        catch (JsonException)
        {
            return [];
        }
    }
}
