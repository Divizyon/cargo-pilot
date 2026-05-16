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
    private readonly IItemRepository _itemRepository;
    private readonly IPendingItemMappingRepository _pendingMappingRepository;
    private readonly IErpProductFetcher _erpProductFetcher;
    private readonly IErpConstraintMappingService _constraintMappingService;
    private readonly ICurrentUserService _currentUserService;
    private readonly IValidator<SyncErpItemsCommand> _validator;
    private readonly ILogger<SyncErpItemsCommandHandler> _logger;

    public SyncErpItemsCommandHandler(
        IIntegrationRepository integrationRepository,
        IErpSettingsRepository erpSettingsRepository,
        IErpPasswordProtector passwordProtector,
        IItemRepository itemRepository,
        IPendingItemMappingRepository pendingMappingRepository,
        IErpProductFetcher erpProductFetcher,
        IErpConstraintMappingService constraintMappingService,
        ICurrentUserService currentUserService,
        IValidator<SyncErpItemsCommand> validator,
        ILogger<SyncErpItemsCommandHandler> logger)
    {
        _integrationRepository = integrationRepository;
        _erpSettingsRepository = erpSettingsRepository;
        _passwordProtector = passwordProtector;
        _itemRepository = itemRepository;
        _pendingMappingRepository = pendingMappingRepository;
        _erpProductFetcher = erpProductFetcher;
        _constraintMappingService = constraintMappingService;
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

            var approvedMappings = await _pendingMappingRepository.GetApprovedByIntegrationAsync(integration.Id, cancellationToken);
            var approvedByErpId = approvedMappings
                .Where(m => m.CargoPilotItemId.HasValue)
                .ToDictionary(m => m.ErpId, StringComparer.OrdinalIgnoreCase);

            // Bulk pre-load: approved item'lar, tüm pending mapping'ler ve mevcut item'lar
            var linkedItemIds = approvedByErpId.Values.Select(m => m.CargoPilotItemId!.Value).Distinct();
            var linkedItemsById = (await _itemRepository.GetByIdsAsync(linkedItemIds, companyId, cancellationToken))
                .ToDictionary(i => i.Id);

            var allPendingMappings = await _pendingMappingRepository.GetAllByIntegrationAsync(integration.Id, cancellationToken);
            var pendingByErpId = allPendingMappings
                .ToDictionary(m => m.ErpId, StringComparer.OrdinalIgnoreCase);

            var existingItemsBySku = (await _itemRepository.GetBySkusAsync(erpProducts.Select(p => p.Sku).Distinct(), companyId, cancellationToken))
                .ToDictionary(i => i.SKU, StringComparer.OrdinalIgnoreCase);

            int added = 0, updated = 0, skipped = 0, pendingMappings = 0, ruleAssigned = 0, ruleNotAssigned = 0;

            foreach (var product in erpProducts)
            {
                var resolution = _constraintMappingService.Resolve(integration.MappingTable, product.ErpConstraints);

                if (approvedByErpId.TryGetValue(product.ErpId, out var approvedMapping) &&
                    linkedItemsById.TryGetValue(approvedMapping.CargoPilotItemId!.Value, out var linkedItem))
                {
                    var (rotations, fragility, stackable, maxStack, maxWeight) = ParseRuleFields(resolution.ResolvedValues);
                    linkedItem.Update(
                        product.Sku, product.Barcode, product.Name, product.ProductType,
                        ParseCategory(product.Category), product.Width, product.Height, product.Length,
                        product.Diameter, product.Weight, fragility, stackable, maxStack, maxWeight,
                        rotations, linkedItem.ImageUrl, linkedItem.StackGroup, linkedItem.SpecialNotes);
                    linkedItem.SetErpSource(product.ErpId, integration.Id);
                    linkedItem.SetRuleAssigned(resolution.IsFullyResolved);
                    _itemRepository.Update(linkedItem);
                    updated++;
                    if (resolution.IsFullyResolved) ruleAssigned++; else ruleNotAssigned++;
                    continue;
                }

                if (!resolution.IsFullyResolved)
                {
                    if (pendingByErpId.TryGetValue(product.ErpId, out var existingPending))
                    {
                        existingPending.UpdateErpData(product.Sku, product.Name, product.RawDataJson);
                        _pendingMappingRepository.Update(existingPending);
                    }
                    else
                    {
                        _pendingMappingRepository.Add(new PendingItemMapping(
                            Guid.NewGuid(), integration.Id, product.ErpId, product.Sku, product.Name, product.RawDataJson));
                        pendingMappings++;
                    }
                    skipped++;
                    continue;
                }

                var (allowedRotations, fragilityType, isStackable, maxStackCount, maxWeightOnTop) = ParseRuleFields(resolution.ResolvedValues);
                var category = ParseCategory(product.Category);

                if (existingItemsBySku.TryGetValue(product.Sku, out var existingItem))
                {
                    existingItem.Update(
                        product.Sku, product.Barcode, product.Name, product.ProductType,
                        category, product.Width, product.Height, product.Length, product.Diameter,
                        product.Weight, fragilityType, isStackable, maxStackCount, maxWeightOnTop,
                        allowedRotations, existingItem.ImageUrl, existingItem.StackGroup, existingItem.SpecialNotes);
                    existingItem.SetErpSource(product.ErpId, integration.Id);
                    existingItem.SetRuleAssigned(true);
                    _itemRepository.Update(existingItem);
                    updated++;
                    ruleAssigned++;
                }
                else
                {
                    var newItem = new Item(
                        Guid.NewGuid(), product.Sku, product.Name, product.ProductType,
                        category, product.Width, product.Height, product.Length, product.Weight,
                        fragilityType, isStackable, maxStackCount, maxWeightOnTop, allowedRotations,
                        product.Barcode, product.Diameter, companyId: companyId);
                    newItem.SetErpSource(product.ErpId, integration.Id);
                    newItem.SetRuleAssigned(true);
                    _itemRepository.Add(newItem);
                    added++;
                    ruleAssigned++;
                }
            }

            integration.RecordSync(DateTime.UtcNow);
            syncLog.Complete(added + updated, ruleAssigned, ruleNotAssigned);

            await _itemRepository.SaveChangesAsync(cancellationToken);

            return Result<SyncErpItemsResult>.Success(
                new SyncErpItemsResult(syncLog.Id, added, updated, skipped, pendingMappings, ruleAssigned, ruleNotAssigned));
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

    private static (AllowedRotations, FragilityType, bool, int, decimal) ParseRuleFields(
        IReadOnlyDictionary<string, string> resolvedValues)
    {
        var rotations = resolvedValues.TryGetValue("AllowedRotations", out var r) && Enum.TryParse<AllowedRotations>(r, out var parsedR)
            ? parsedR : AllowedRotations.All;

        var fragility = resolvedValues.TryGetValue("FragilityType", out var f) && Enum.TryParse<FragilityType>(f, out var parsedF)
            ? parsedF : FragilityType.NonFragile;

        var stackable = !resolvedValues.TryGetValue("IsStackable", out var s) || !bool.TryParse(s, out var parsedS) || parsedS;

        var maxStack = resolvedValues.TryGetValue("MaxStackCount", out var ms) && int.TryParse(ms, out var parsedMs)
            ? parsedMs : 1;

        var maxWeight = resolvedValues.TryGetValue("MaxWeightOnTop", out var mw) && decimal.TryParse(mw, out var parsedMw)
            ? parsedMw : 0m;

        return (rotations, fragility, stackable, maxStack, maxWeight);
    }

    private static ItemCategory ParseCategory(string? category)
    {
        if (string.IsNullOrWhiteSpace(category))
            return ItemCategory.Package;

        return Enum.TryParse<ItemCategory>(category, ignoreCase: true, out var parsed)
            ? parsed : ItemCategory.Package;
    }
}
