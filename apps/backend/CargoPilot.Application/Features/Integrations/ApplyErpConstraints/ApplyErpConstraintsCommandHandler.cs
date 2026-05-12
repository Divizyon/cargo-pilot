using CargoPilot.Application.Abstractions;
using CargoPilot.Application.Common.Interfaces;
using CargoPilot.Application.Common.Models;
using CargoPilot.Domain.Entities;
using MediatR;

namespace CargoPilot.Application.Features.Integrations.ApplyErpConstraints;

public sealed class ApplyErpConstraintsCommandHandler
    : IRequestHandler<ApplyErpConstraintsCommand, Result<ApplyErpConstraintsResponse>>
{
    private readonly IIntegrationRepository _integrationRepository;
    private readonly IErpConstraintMappingService _mappingService;
    private readonly ICurrentUserService _currentUserService;

    public ApplyErpConstraintsCommandHandler(
        IIntegrationRepository integrationRepository,
        IErpConstraintMappingService mappingService,
        ICurrentUserService currentUserService)
    {
        _integrationRepository = integrationRepository;
        _mappingService = mappingService;
        _currentUserService = currentUserService;
    }

    public async Task<Result<ApplyErpConstraintsResponse>> Handle(
        ApplyErpConstraintsCommand request,
        CancellationToken cancellationToken)
    {
        var companyId = _currentUserService.CompanyId;
        if (companyId is null)
            return Result<ApplyErpConstraintsResponse>.Failure(
                new Error(ErrorType.Unauthorized, "Auth.NoCompany", "Şirket bağlamı bulunamadı."));

        if (request.Products is null || request.Products.Count == 0)
            return Result<ApplyErpConstraintsResponse>.Failure(
                new Error(ErrorType.Validation, "ApplyErpConstraints.EmptyList", "En az bir ürün gönderilmelidir."));

        var integration = await _integrationRepository.GetByIdAsync(request.IntegrationId, companyId.Value, cancellationToken);
        if (integration is null)
            return Result<ApplyErpConstraintsResponse>.Failure(
                new Error(ErrorType.NotFound, "Integration.NotFound", "Integration bulunamadı."));

        var erpIds = request.Products.Select(p => p.ErpId).ToList();
        var items = await _integrationRepository.GetItemsByErpIdsAsync(
            request.IntegrationId, erpIds, cancellationToken);

        var itemByErpId = items
            .Where(i => i.ErpId is not null)
            .ToDictionary(i => i.ErpId!, StringComparer.OrdinalIgnoreCase);

        int ruleAssigned = 0;
        int ruleNotAssigned = 0;
        var unmatchedErpIds = new List<string>();

        foreach (var product in request.Products)
        {
            if (!itemByErpId.TryGetValue(product.ErpId, out var item))
            {
                unmatchedErpIds.Add(product.ErpId);
                continue;
            }

            var resolution = _mappingService.Resolve(integration.MappingTable, product.Constraints);

            if (resolution.ResolvedValues.Count > 0)
                item.ApplyErpConstraints(resolution.ResolvedValues);

            item.SetRuleAssigned(resolution.IsFullyResolved);

            if (resolution.IsFullyResolved)
                ruleAssigned++;
            else
                ruleNotAssigned++;
        }

        int processedCount = request.Products.Count - unmatchedErpIds.Count;
        var syncLog = new SyncLog(Guid.NewGuid(), request.IntegrationId);
        syncLog.Complete(processedCount, ruleAssigned, ruleNotAssigned);
        integration.RecordSync(DateTime.UtcNow);
        _integrationRepository.AddSyncLog(syncLog);

        await _integrationRepository.SaveChangesAsync(cancellationToken);

        return Result<ApplyErpConstraintsResponse>.Success(
            new ApplyErpConstraintsResponse(processedCount, ruleAssigned, ruleNotAssigned, unmatchedErpIds));
    }
}
