using System.Text.Json;
using CargoPilot.Application.Abstractions;
using CargoPilot.Application.Common.Interfaces;
using CargoPilot.Application.Common.Models;
using CargoPilot.Domain.Entities;
using CargoPilot.Domain.Enums;
using FluentValidation;
using MediatR;
using Microsoft.Extensions.Logging;

namespace CargoPilot.Application.Features.Integrations.SyncErpItems;

public sealed class SyncErpItemsCommandHandler : IRequestHandler<SyncErpItemsCommand, Result<SyncErpItemsResult>>
{
    private static readonly Action<ILogger, Guid, Exception?> _logSyncFailed =
        LoggerMessage.Define<Guid>(
            LogLevel.Error,
            new EventId(1, "ErpSyncFailed"),
            "ERP sync failed for integration {IntegrationId}");

    private readonly IIntegrationRepository _integrationRepository;
    private readonly IErpSettingsRepository _erpSettingsRepository;
    private readonly IErpPasswordProtector _passwordProtector;
    private readonly IDraftItemRepository _draftItemRepository;
    private readonly IErpProductFetcher _erpProductFetcher;
    private readonly ICurrentUserService _currentUserService;
    private readonly IValidator<SyncErpItemsCommand> _validator;
    private readonly ILogger<SyncErpItemsCommandHandler> _logger;

    public SyncErpItemsCommandHandler(
        IIntegrationRepository integrationRepository,
        IErpSettingsRepository erpSettingsRepository,
        IErpPasswordProtector passwordProtector,
        IDraftItemRepository draftItemRepository,
        IErpProductFetcher erpProductFetcher,
        ICurrentUserService currentUserService,
        IValidator<SyncErpItemsCommand> validator,
        ILogger<SyncErpItemsCommandHandler> logger)
    {
        _integrationRepository = integrationRepository;
        _erpSettingsRepository = erpSettingsRepository;
        _passwordProtector = passwordProtector;
        _draftItemRepository = draftItemRepository;
        _erpProductFetcher = erpProductFetcher;
        _currentUserService = currentUserService;
        _validator = validator;
        _logger = logger;
    }

    public async Task<Result<SyncErpItemsResult>> Handle(
        SyncErpItemsCommand request,
        CancellationToken cancellationToken)
    {
        var validationResult = await _validator.ValidateAsync(request, cancellationToken);
        if (!validationResult.IsValid)
        {
            var failures = validationResult.Errors
                .Select(e => new ValidationFailure(e.PropertyName, e.ErrorMessage))
                .ToList();
            return Result<SyncErpItemsResult>.Failure(
                new Error(ErrorType.Validation, "Validation.Failed", "Doğrulama hatası.", failures));
        }

        var companyId = _currentUserService.CompanyId;

        var integration = await _integrationRepository.GetByIdAsync(request.IntegrationId, companyId, cancellationToken);
        if (integration is null)
        {
            return Result<SyncErpItemsResult>.Failure(
                new Error(ErrorType.NotFound, "Integration.NotFound", "Entegrasyon bulunamadı."));
        }

        var erpSettings = await _erpSettingsRepository.GetByCompanyIdAsync(companyId!.Value, cancellationToken);
        if (erpSettings is null)
        {
            return Result<SyncErpItemsResult>.Failure(
                new Error(ErrorType.NotFound, "ErpSettings.NotConfigured", "ERP bağlantı ayarları yapılandırılmamış."));
        }

        var plainPassword = _passwordProtector.Unprotect(erpSettings.PasswordEncrypted);
        var authCredentialsJson = JsonSerializer.Serialize(new
        {
            Database = erpSettings.CompanyCode,
            UserId = erpSettings.Username,
            Password = plainPassword
        });

        var syncLog = new SyncLog(Guid.NewGuid(), integration.Id);
        _integrationRepository.AddSyncLog(syncLog);

        try
        {
            var erpProducts = await _erpProductFetcher.FetchAsync(
                erpSettings.ServerAddress,
                authCredentialsJson,
                request.CategoryFilter,
                request.WarehouseFilter,
                cancellationToken);

            int added = 0, updated = 0, skipped = 0;

            foreach (var product in erpProducts)
            {
                var existing = await _draftItemRepository.GetByErpIdAsync(
                    product.ErpId, integration.Id, companyId.Value, cancellationToken);

                if (existing is not null)
                {
                    if (existing.Status == DraftItemStatus.Approved)
                    {
                        skipped++;
                        continue;
                    }

                    existing.UpdateFromErp(
                        product.Sku,
                        product.Name,
                        product.RawDataJson,
                        product.Width,
                        product.Height,
                        product.Length,
                        product.Weight,
                        product.Barcode,
                        product.Diameter);
                    if (existing.Status == DraftItemStatus.Rejected)
                        existing.ResetToPending();

                    _draftItemRepository.Update(existing);
                    updated++;
                }
                else
                {
                    var draft = new DraftItem(
                        Guid.NewGuid(),
                        companyId.Value,
                        integration.Id,
                        product.ErpId,
                        product.RawDataJson,
                        product.Sku,
                        product.Name,
                        string.IsNullOrWhiteSpace(product.ProductType) ? "STANDARD" : product.ProductType,
                        ParseCategory(product.Category),
                        product.Width,
                        product.Height,
                        product.Length,
                        product.Weight,
                        FragilityType.NonFragile,
                        isStackable: true,
                        maxStackCount: 1,
                        maxWeightOnTop: 0m,
                        AllowedRotations.All,
                        product.Barcode,
                        product.Diameter);

                    _draftItemRepository.Add(draft);
                    added++;
                }
            }

            integration.RecordSync(DateTime.UtcNow);
            syncLog.Complete(added + updated);

            await _draftItemRepository.SaveChangesAsync(cancellationToken);

            return Result<SyncErpItemsResult>.Success(
                new SyncErpItemsResult(syncLog.Id, added, updated, skipped));
        }
        catch (Exception ex)
        {
            _logSyncFailed(_logger, integration.Id, ex);
            syncLog.Fail(ex.Message);
            await _integrationRepository.SaveChangesAsync(cancellationToken);
            return Result<SyncErpItemsResult>.Failure(
                new Error(ErrorType.Unexpected, "Sync.Failed", "ERP senkronizasyonu sırasında bir hata oluştu."));
        }
    }

    private static ItemCategory ParseCategory(string? category)
    {
        if (string.IsNullOrWhiteSpace(category))
            return ItemCategory.Package;

        return Enum.TryParse<ItemCategory>(category, ignoreCase: true, out var parsed)
            ? parsed : ItemCategory.Package;
    }
}
