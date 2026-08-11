using System.Text.Json;
using CargoPilot.Application.Abstractions;
using CargoPilot.Application.Common.Erp;
using CargoPilot.Application.Common.Interfaces;
using CargoPilot.Application.Common.Items;
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

    private static readonly Action<ILogger, Guid, string, Exception?> _logRowFailed =
        LoggerMessage.Define<Guid, string>(
            LogLevel.Warning,
            new EventId(2, "ErpSyncRowFailed"),
            "ERP sync row failed for integration {IntegrationId}, erpId {ErpId}");

    private static readonly Action<ILogger, Guid, Exception?> _logFailureStateNotSaved =
        LoggerMessage.Define<Guid>(
            LogLevel.Error,
            new EventId(3, "ErpSyncFailureStateNotSaved"),
            "ERP sync failure state could not be persisted for integration {IntegrationId}");

    private readonly IIntegrationRepository _integrationRepository;
    private readonly IErpSettingsRepository _erpSettingsRepository;
    private readonly IErpPasswordProtector _passwordProtector;
    private readonly IDraftItemRepository _draftItemRepository;
    private readonly IErpProductFetcher _erpProductFetcher;
    private readonly ICurrentUserService _currentUserService;
    private readonly INotificationService _notificationService;
    private readonly ILogger<SyncErpItemsCommandHandler> _logger;

    public SyncErpItemsCommandHandler(
        IIntegrationRepository integrationRepository,
        IErpSettingsRepository erpSettingsRepository,
        IErpPasswordProtector passwordProtector,
        IDraftItemRepository draftItemRepository,
        IErpProductFetcher erpProductFetcher,
        ICurrentUserService currentUserService,
        INotificationService notificationService,
        IValidator<SyncErpItemsCommand> validator,
        ILogger<SyncErpItemsCommandHandler> logger)
    {
        _integrationRepository = integrationRepository;
        _erpSettingsRepository = erpSettingsRepository;
        _passwordProtector = passwordProtector;
        _draftItemRepository = draftItemRepository;
        _erpProductFetcher = erpProductFetcher;
        _currentUserService = currentUserService;
        _notificationService = notificationService;
        _logger = logger;
    }

    public async Task<Result<SyncErpItemsResult>> Handle(
        SyncErpItemsCommand request,
        CancellationToken cancellationToken)
    {
        var companyId = _currentUserService.CompanyId;
        if (companyId is null)
        {
            return Result<SyncErpItemsResult>.Failure(
                new Error(ErrorType.Unauthorized, "Auth.NoCompany", "Şirket bağlamı bulunamadı."));
        }

        var startedAtUtc = DateTime.UtcNow;
        var hasRunningSync = await _integrationRepository.HasAnyRunningSyncAsync(
            companyId.Value, ErpSyncPolicy.StaleThreshold(startedAtUtc), cancellationToken);
        if (hasRunningSync)
        {
            return Result<SyncErpItemsResult>.Failure(
                new Error(ErrorType.Conflict, "Sync.AlreadyRunning", "Şirket için senkronizasyon zaten çalışıyor."));
        }

        var integration = await _integrationRepository.GetByIdAsync(request.IntegrationId, companyId, cancellationToken);
        if (integration is null)
        {
            return Result<SyncErpItemsResult>.Failure(
                new Error(ErrorType.NotFound, "Integration.NotFound", "Entegrasyon bulunamadı."));
        }

        var erpSettings = await _erpSettingsRepository.GetByCompanyIdAsync(companyId.Value, cancellationToken);
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

        // Kilit once yazilir ki eszamanli ikinci istek Running'i gorup 409 alsin.
        integration.StartSync(startedAtUtc);
        await _integrationRepository.SaveChangesAsync(cancellationToken);

        try
        {
            var erpProducts = await _erpProductFetcher.FetchAsync(
                erpSettings.ServerAddress,
                authCredentialsJson,
                request.CategoryFilter,
                request.WarehouseFilter,
                cancellationToken);

            int added = 0, updated = 0, missingFieldCount = 0;
            var rowErrors = new List<SyncRowError>();
            var seenErpIds = new HashSet<string>(StringComparer.OrdinalIgnoreCase);

            foreach (var product in erpProducts)
            {
                try
                {
                    // (IntegrationId, ErpId) DB'de unique; ayni partide tekrar eden kayit
                    // tum save'i dusurmesin diye satir hatasina cevrilir.
                    if (!seenErpIds.Add(product.ErpId))
                    {
                        rowErrors.Add(new SyncRowError(
                            product.ErpId, product.Sku, "Aynı ERP kaydı bu senkronizasyonda birden fazla geldi."));
                        continue;
                    }

                    var missingFields = product.MissingFields ?? [];
                    if (missingFields.Count > 0)
                        missingFieldCount++;

                    var existing = await _draftItemRepository.GetByErpIdAsync(
                        product.ErpId, integration.Id, companyId.Value, cancellationToken);

                    if (existing is not null)
                    {
                        if (existing.Status == DraftItemStatus.Approved)
                        {
                            existing.SetUpdatePending(product.Sku, product.Name, product.RawDataJson, missingFields);
                            _draftItemRepository.Update(existing);
                            updated++;
                            continue;
                        }

                        // Ret kalicidir: Rejected/UpdateDismissed taslagin ERP verisi tazelenir
                        // ama durumu sync ile Pending'e donmez; geri alma yalnizca kullanicidadir.
                        existing.UpdateFromErp(product.Sku, product.Name, product.RawDataJson, missingFields);
                        _draftItemRepository.Update(existing);
                        updated++;
                    }
                    else
                    {
                        // ERP istif bilgisi tasimaz; varsayilanlar ortak normalizasyondan gecer
                        // ki 'istiflenebilir ama ust agirlik limiti 0' celiskisi dogmasin.
                        var (isStackable, maxStackCount, maxWeightOnTop) = ItemStacking.Normalize(
                            isStackable: true,
                            maxStackCount: 1,
                            maxWeightOnTop: 0m,
                            product.Weight);

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
                            isStackable,
                            maxStackCount,
                            maxWeightOnTop,
                            AllowedRotations.All,
                            product.Barcode,
                            product.Diameter,
                            missingFields);

                        _draftItemRepository.Add(draft);
                        added++;
                    }
                }
#pragma warning disable CA1031 // Tek bozuk satir diger satirlarin kaydini engellememeli.
                catch (Exception rowEx)
#pragma warning restore CA1031
                {
                    _logRowFailed(_logger, integration.Id, product.ErpId, rowEx);
                    rowErrors.Add(new SyncRowError(product.ErpId, product.Sku, rowEx.Message));
                }
            }

            integration.CompleteSync(DateTime.UtcNow, integration.NextScheduledSyncAt);

            if (rowErrors.Count > 0)
            {
                syncLog.PartialFail(
                    added + updated,
                    BuildPartialFailMessage(rowErrors.Count, erpProducts.Count),
                    JsonSerializer.Serialize(rowErrors));
            }
            else
            {
                syncLog.Complete(added + updated);
            }

            await _draftItemRepository.SaveChangesAsync(cancellationToken);

            return Result<SyncErpItemsResult>.Success(
                new SyncErpItemsResult(
                    syncLog.Id,
                    added,
                    updated,
                    rowErrors.Count,
                    rowErrors.Count,
                    missingFieldCount,
                    rowErrors));
        }
        catch (Exception ex)
        {
            _logSyncFailed(_logger, integration.Id, ex);
            syncLog.Fail(ex.Message);
            integration.FailSync();
            await TrySaveFailureStateAsync(integration.Id, cancellationToken);

            if (_currentUserService.UserId is { } userId)
            {
                await _notificationService.CreateAsync(
                    userId: userId,
                    companyId: companyId,
                    type: NotificationType.ErpSyncError,
                    title: "ERP Senkronizasyonu Başarısız",
                    description: $"ERP senkronizasyonu sırasında bir hata oluştu: {ex.Message}",
                    actionUrl: $"/settings/erp?highlight=erp-card-{integration.Id}",
                    integrationId: integration.Id,
                    cancellationToken: cancellationToken);
            }

            return Result<SyncErpItemsResult>.Failure(
                new Error(ErrorType.Unexpected, "Sync.Failed", "ERP senkronizasyonu sırasında bir hata oluştu."));
        }
    }

    /// <summary>
    /// Hata durumunu yazmak da basarisiz olabilir (or. kayit sirasindaki ihlal); bu durumda
    /// entegrasyon Running'de kalir ve zaman asimi kilidi cozer.
    /// </summary>
    private async Task TrySaveFailureStateAsync(Guid integrationId, CancellationToken cancellationToken)
    {
        try
        {
            await _integrationRepository.SaveChangesAsync(cancellationToken);
        }
#pragma warning disable CA1031 // Asil hata zaten kullaniciya donuyor; ikincil kayit hatasi yutulur.
        catch (Exception saveEx)
#pragma warning restore CA1031
        {
            _logFailureStateNotSaved(_logger, integrationId, saveEx);
        }
    }

    private static string BuildPartialFailMessage(int failedCount, int totalCount) =>
        $"{totalCount} satırdan {failedCount} tanesi işlenemedi; diğer satırlar kaydedildi.";

    private static ItemCategory ParseCategory(string? category)
    {
        if (string.IsNullOrWhiteSpace(category))
            return ItemCategory.Package;

        return Enum.TryParse<ItemCategory>(category, ignoreCase: true, out var parsed)
            ? parsed : ItemCategory.Package;
    }
}
