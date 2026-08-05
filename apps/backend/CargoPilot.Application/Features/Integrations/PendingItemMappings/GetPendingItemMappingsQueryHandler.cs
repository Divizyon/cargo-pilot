using CargoPilot.Application.Abstractions;
using CargoPilot.Application.Common.Interfaces;
using CargoPilot.Application.Common.Models;
using MediatR;

namespace CargoPilot.Application.Features.Integrations.PendingItemMappings;

public sealed class GetPendingItemMappingsQueryHandler
    : IRequestHandler<GetPendingItemMappingsQuery, Result<PagedResult<PendingItemMappingDto>>>
{
    private readonly IPendingItemMappingRepository _repository;
    private readonly IIntegrationRepository _integrationRepository;
    private readonly ICurrentUserService _currentUserService;

    public GetPendingItemMappingsQueryHandler(
        IPendingItemMappingRepository repository,
        IIntegrationRepository integrationRepository,
        ICurrentUserService currentUserService)
    {
        _repository = repository;
        _integrationRepository = integrationRepository;
        _currentUserService = currentUserService;
    }

    public async Task<Result<PagedResult<PendingItemMappingDto>>> Handle(
        GetPendingItemMappingsQuery request,
        CancellationToken cancellationToken)
    {
        var companyId = _currentUserService.CompanyId;

        var integration = await _integrationRepository.GetByIdAsync(request.IntegrationId, companyId, cancellationToken);
        if (integration is null)
        {
            return Result<PagedResult<PendingItemMappingDto>>.Failure(
                new Error(ErrorType.NotFound, "Integration.NotFound", "Entegrasyon bulunamadı."));
        }

        var paged = await _repository.GetPagedAsync(
            request.IntegrationId, request.Status, request.Page, request.PageSize, cancellationToken);

        var dtos = paged.Items
            .Select(m => new PendingItemMappingDto(
                m.Id, m.IntegrationId, m.ErpId, m.ErpSku, m.ErpProductName,
                m.ErpRawDataJson, m.CargoPilotItemId, m.Status,
                m.CreatedAtUtc, m.UpdatedAtUtc))
            .ToList();

        return Result<PagedResult<PendingItemMappingDto>>.Success(
            new PagedResult<PendingItemMappingDto>(dtos, paged.TotalCount, request.Page, request.PageSize));
    }
}
