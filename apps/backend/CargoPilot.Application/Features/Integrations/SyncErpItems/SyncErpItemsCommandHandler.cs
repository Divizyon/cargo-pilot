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

    private static readonly Action<ILogger, Guid, int, int, Exception?> _logUnaccountedRows =
        LoggerMessage.Define<Guid, int, int>(
            LogLevel.Warning,
            new EventId(4, "ErpSyncUnaccountedRows"),
            "ERP sync mutabakat farki: integration {IntegrationId}, kaynak {SourceTotal}, fark {Unaccounted}");

    private static readonly Action<ILogger, Guid, Exception?> _logFailureStateNotSaved =
        LoggerMessage.Define<Guid>(
            LogLevel.Error,
            new EventId(3, "ErpSyncFailureStateNotSaved"),
            "ERP sync failure state could not be persisted for integration {IntegrationId}");

    private readonly IIntegrationRepository _integrationRepository;
    private readonly IErpSettingsRepository _erpSettingsRepository;
    private readonly IErpPasswordProtector _passwordProtector;
    private readonly IDraftItemRepository _draftItemRepository;
    private readonly IEnumerable<IErpProductFetcher> _erpProductFetchers;
    private readonly ICurrentUserService _currentUserService;
    private readonly INotificationService _notificationService;
    private readonly ILogger<SyncErpItemsCommandHandler> _logger;

    public SyncErpItemsCommandHandler(
        IIntegrationRepository integrationRepository,
        IErpSettingsRepository erpSettingsRepository,
        IErpPasswordProtector passwordProtector,
        IDraftItemRepository draftItemRepository,
        IEnumerable<IErpProductFetcher> erpProductFetchers,
        ICurrentUserService currentUserService,
        INotificationService notificationService,
        IValidator<SyncErpItemsCommand> validator,
        ILogger<SyncErpItemsCommandHandler> logger)
    {
        _integrationRepository = integrationRepository;
        _erpSettingsRepository = erpSettingsRepository;
        _passwordProtector = passwordProtector;
        _draftItemRepository = draftItemRepository;
        _erpProductFetchers = erpProductFetchers;
        _currentUserService = currentUserService;
        _notificationService = notificationService;
        _logger = logger;
    }

    public async Task<Result<SyncErpItemsResult>> Handle(
        SyncErpItemsCommand request,
        CancellationToken cancellationToken)
    {
        // Arka plan zamanlayicisinin HTTP baglami yoktur; sirket kimligi komutla tasinir.
        var companyId = request.CompanyIdOverride ?? _currentUserService.CompanyId;
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

        // Saglayiciya karsilik gelen fetcher yoksa sync hic baslamaz; boylece yanlis
        // sema (or. Logo veritabaninda Netsis tablosu) sorgulanmasi imkansizdir.
        var productFetcher = _erpProductFetchers
            .FirstOrDefault(f => f.ProviderType == erpSettings.ProviderType);
        if (productFetcher is null)
        {
            return Result<SyncErpItemsResult>.Failure(
                new Error(
                    ErrorType.Validation,
                    "Sync.ProviderNotSupported",
                    $"{ProviderDisplayName(erpSettings.ProviderType)} ürün senkronizasyonu henüz desteklenmiyor."));
        }

        // Kimlik bilgisi duz JSON string yerine tipli tasinir; ToString sifreyi maskeler.
        ErpCredentials credentials;
        try
        {
            credentials = ErpCredentials.Create(
                erpSettings.CompanyCode,
                erpSettings.Username,
                _passwordProtector.Unprotect(erpSettings.PasswordEncrypted),
                erpSettings.TrustServerCertificate);
        }
        catch (ErpConfigurationException ex)
        {
            return Result<SyncErpItemsResult>.Failure(
                new Error(ErrorType.Validation, "Sync.ErpConfigurationInvalid", ex.Message));
        }

        var syncLog = new SyncLog(Guid.NewGuid(), integration.Id);
        _integrationRepository.AddSyncLog(syncLog);

        // Kilit once yazilir ki eszamanli ikinci istek Running'i gorup 409 alsin.
        integration.StartSync(startedAtUtc);
        await _integrationRepository.SaveChangesAsync(cancellationToken);

        try
        {
            var fetchResult = await productFetcher.FetchAsync(
                erpSettings.ServerAddress,
                credentials,
                request.CategoryFilter,
                request.WarehouseFilter,
                cancellationToken);

            var erpProducts = fetchResult.Products;

            int added = 0, updated = 0, unchanged = 0, missingFieldCount = 0;
            var rowErrors = new List<SyncRowError>();
            var seenErpIds = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
            var dropped = new Dictionary<ErpDropReason, int>(fetchResult.DroppedAtSource);

            foreach (var product in erpProducts)
            {
                try
                {
                    // (IntegrationId, ErpId) DB'de unique; ayni partide tekrar eden kayit
                    // hata degil eleme sayilir ve muhasebede DuplicateErpId olarak gorunur.
                    if (!seenErpIds.Add(product.ErpId))
                    {
                        dropped[ErpDropReason.DuplicateErpId] =
                            dropped.GetValueOrDefault(ErpDropReason.DuplicateErpId) + 1;
                        continue;
                    }

                    var missingFields = product.MissingFields ?? [];

                    var existing = await _draftItemRepository.GetByErpIdAsync(
                        product.ErpId, integration.Id, companyId.Value, cancellationToken);

                    // ERP tarafinda hicbir sey degismediyse taslaga dokunulmaz. Aksi halde
                    // onaylanmis her urun her taramada "guncellendi" isaretlenir ve kullanici
                    // karar bekleyen bos bildirim yiginiyla karsilasir.
                    if (existing is not null && existing.MatchesErpSnapshot(product.RawDataJson))
                    {
                        unchanged++;
                        continue;
                    }

                    // Yalnizca gercekten yazilan satirlar sayilir; atlanan satirin eksik alani
                    // kullanici tarafindan coktan doldurulmus olabilir.
                    if (missingFields.Count > 0)
                        missingFieldCount++;

                    if (existing is not null)
                    {
                        var refresh = BuildErpRefresh(product, missingFields);

                        if (existing.Status == DraftItemStatus.Approved)
                        {
                            existing.SetUpdatePending(refresh);
                            _draftItemRepository.Update(existing);
                            updated++;
                            continue;
                        }

                        // Ret kalicidir: Rejected/UpdateDismissed taslagin ERP verisi tazelenir
                        // ama durumu sync ile Pending'e donmez; geri alma yalnizca kullanicidadir.
                        existing.UpdateFromErp(refresh);
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

                        // ERP grup kodu isin kategorisidir, urunun fiziksel kabi degil. Tip
                        // sabit Koli baslar ve kullanici aktarim izgarasinda degistirir.
                        var stackGroup = ErpLoadGroupResolver.Resolve(product.GroupCode);

                        var draft = new DraftItem(
                            Guid.NewGuid(),
                            companyId.Value,
                            integration.Id,
                            product.ErpId,
                            product.RawDataJson,
                            product.Sku,
                            product.Name,
                            string.IsNullOrWhiteSpace(product.ProductType) ? "STANDARD" : product.ProductType,
                            ItemCategory.Box,
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
                            missingFields,
                            stackGroup,
                            LoadGroups.IncompatibleWith(stackGroup));

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

            // Vade her calismada ileri alinir; aksi halde zamanlayici gecmis bir vadeyi
            // her taramada yeniden tetiklerdi.
            var completedAtUtc = DateTime.UtcNow;
            integration.CompleteSync(
                completedAtUtc,
                ErpSyncPolicy.NextScheduledSyncAt(integration.SyncFrequency, completedAtUtc));

            var droppedByReason = dropped.ToDictionary(kv => kv.Key.ToString(), kv => kv.Value);
            var unaccounted = CalculateUnaccounted(
                fetchResult.SourceTotalCount, added, updated, unchanged, rowErrors.Count, dropped);
            if (unaccounted != 0)
                _logUnaccountedRows(_logger, integration.Id, fetchResult.SourceTotalCount, unaccounted, null);

            var accounting = new SyncAccounting(
                fetchResult.SourceTotalCount,
                erpProducts.Count,
                droppedByReason.Count > 0 ? JsonSerializer.Serialize(droppedByReason) : null,
                unchanged,
                unaccounted);

            if (rowErrors.Count > 0)
            {
                syncLog.PartialFail(
                    added + updated,
                    BuildPartialFailMessage(rowErrors.Count, erpProducts.Count),
                    JsonSerializer.Serialize(rowErrors),
                    accounting);
            }
            else
            {
                syncLog.Complete(added + updated, accounting);
            }

            await _draftItemRepository.SaveChangesAsync(cancellationToken);

            return Result<SyncErpItemsResult>.Success(
                new SyncErpItemsResult(
                    syncLog.Id,
                    added,
                    updated,
                    unchanged,
                    rowErrors.Count,
                    rowErrors.Count,
                    missingFieldCount,
                    rowErrors,
                    fetchResult.SourceTotalCount,
                    droppedByReason,
                    unaccounted));
        }
        catch (Exception ex)
        {
            _logSyncFailed(_logger, integration.Id, ex);
            syncLog.Fail(ex.Message);
            integration.FailSync();
            // Basarisiz deneme de vadeyi tuketir; hatali entegrasyon her taramada tekrar denenmez.
            integration.RescheduleNextSync(
                ErpSyncPolicy.NextScheduledSyncAt(integration.SyncFrequency, DateTime.UtcNow));
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

            // Yapilandirma hatasi kullaniciya aynen gosterilir; digerleri genel mesaja duser.
            return Result<SyncErpItemsResult>.Failure(
                ex is ErpConfigurationException
                    ? new Error(ErrorType.Validation, "Sync.ErpConfigurationInvalid", ex.Message)
                    : new Error(ErrorType.Unexpected, "Sync.Failed", "ERP senkronizasyonu sırasında bir hata oluştu."));
        }
    }

    private static string ProviderDisplayName(ErpProviderType providerType) => providerType switch
    {
        ErpProviderType.Logo => "Logo",
        ErpProviderType.Netsis => "Netsis",
        _ => "Seçili ERP"
    };

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

    /// <summary>
    /// Mutabakat invariantı: SourceTotal == added + updated + unchanged + skipped + ΣDropped.
    /// Fark sifir degilse kaynaktaki satirlarin bir kismi hicbir sayaca dusmemistir;
    /// deger gizlenmeden 'unaccounted' olarak kaydedilir.
    /// </summary>
    private static int CalculateUnaccounted(
        int sourceTotal,
        int added,
        int updated,
        int unchanged,
        int skipped,
        IReadOnlyDictionary<ErpDropReason, int> dropped) =>
        sourceTotal - (added + updated + unchanged + skipped + dropped.Values.Sum());

    private static string BuildPartialFailMessage(int failedCount, int totalCount) =>
        $"{totalCount} satırdan {failedCount} tanesi işlenemedi; diğer satırlar kaydedildi.";

    /// <summary>
    /// Var olan taslaga uygulanacak ERP tazelemesi. Tip (<c>Category</c>) tazelemeye girmez:
    /// ERP urunun fiziksel kabini tasimaz, sabit varsayilanin her senkronda yeniden yazilmasi
    /// kullanicinin izgaradaki secimini silerdi. Yuk grubu da yalnizca grup kodu gercekten bir
    /// gruba isaret ediyorsa tasinir; varsayilana dusen kod mevcut secimi ezmez.
    /// </summary>
    private static DraftItem.ErpRefresh BuildErpRefresh(
        ErpProductDto product,
        IReadOnlyList<string> missingFields)
    {
        var carriesGroupInfo = ErpLoadGroupResolver.CarriesGroupInfo(product.GroupCode);
        var stackGroup = carriesGroupInfo ? ErpLoadGroupResolver.Resolve(product.GroupCode) : null;

        return new DraftItem.ErpRefresh(
            product.Sku,
            product.Name,
            product.RawDataJson,
            product.Width,
            product.Height,
            product.Length,
            product.Weight,
            product.Barcode,
            stackGroup,
            LoadGroups.IncompatibleWith(stackGroup),
            missingFields);
    }
}
