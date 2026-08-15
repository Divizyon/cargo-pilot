using System.Data.Common;
using System.Globalization;
using CargoPilot.Application.Common.Erp;
using CargoPilot.Application.Common.Interfaces;
using CargoPilot.Application.Common.Models;
using CargoPilot.Application.Common.Settings;
using CargoPilot.Domain.Entities;
using CargoPilot.Domain.Enums;
using Microsoft.Extensions.Options;

namespace CargoPilot.Infrastructure.Services;

/// <summary>
/// Onaylanan plani ERP'ye siparis olarak yazar. Saglayiciya karsilik gelen yazici yoksa
/// aktarim hic denenmez; boylece yanlis semaya yazma imkansizdir.
/// </summary>
/// <remarks>
/// Idempotency: siparis numarasi plan kimliginden deterministik uretilir, ayni planin
/// ikinci aktariminda ERP'de kayit zaten bulundugundan yeni satir yazilmaz.
/// Hata siniflari: yapilandirma/is kurali hatalari kalicidir (yeniden denenmez),
/// teknik hatalar <see cref="ErrorType.Unexpected"/> ile doner ve job tarafindan
/// yeniden denenir.
/// </remarks>
internal sealed class ErpExportService : IErpExportService {
    /// <summary>Siparis numarasinda kullanilan plan kimligi uzunlugu (FATIRS_NO kisa tutulur).</summary>
    internal const int PlanIdSegmentLength = 12;

    private readonly IErpSettingsRepository _erpSettingsRepository;
    private readonly IErpPasswordProtector _passwordProtector;
    private readonly ILoadingPlanRepository _planRepository;
    private readonly IEnumerable<IErpOrderWriter> _orderWriters;
    private readonly ErpExportSettings _exportSettings;

    public ErpExportService(
        IErpSettingsRepository erpSettingsRepository,
        IErpPasswordProtector passwordProtector,
        ILoadingPlanRepository planRepository,
        IEnumerable<IErpOrderWriter> orderWriters,
        IOptions<ErpExportSettings> exportSettings)
    {
        _erpSettingsRepository = erpSettingsRepository;
        _passwordProtector = passwordProtector;
        _planRepository = planRepository;
        _orderWriters = orderWriters;
        _exportSettings = exportSettings.Value;
    }

    public async Task<Result<int>> ExportAsync(
        LoadingPlan plan,
        Integration integration,
        CancellationToken cancellationToken = default)
    {
        var erpSettings = await _erpSettingsRepository.GetByCompanyIdAsync(integration.CompanyId, cancellationToken);
        if (erpSettings is null)
            return Failure(ErrorType.Validation, "Erp.SettingsNotConfigured",
                "ERP bağlantı ayarları yapılandırılmamış; plan aktarılmadı.");

        var writer = _orderWriters.FirstOrDefault(w => w.ProviderType == erpSettings.ProviderType);
        if (writer is null)
            return Failure(ErrorType.Validation, "Erp.ExportProviderNotSupported",
                $"{ProviderDisplayName(erpSettings.ProviderType)} için sipariş aktarımı henüz desteklenmiyor.");

        if (string.IsNullOrWhiteSpace(_exportSettings.CustomerCode))
            return Failure(ErrorType.Validation, "Erp.ExportCustomerCodeMissing",
                "ERP aktarımı için cari kodu (Erp:CustomerCode) tanımlanmamış; plan aktarılmadı.");

        var exportLines = await _planRepository.GetErpExportLinesAsync(plan.Id, cancellationToken);
        if (exportLines.Count == 0)
            return Failure(ErrorType.BusinessRule, "Erp.ExportNoLines",
                "Planda araca yerleşen ürün bulunmadığı için ERP'ye aktarılacak sipariş satırı yok.");

        var missingCode = exportLines.FirstOrDefault(l => string.IsNullOrWhiteSpace(ProductCodeOf(l)));
        if (missingCode is not null)
            return Failure(ErrorType.BusinessRule, "Erp.ExportProductCodeMissing",
                $"'{missingCode.Name}' ürününün ERP stok kodu boş olduğu için plan aktarılamadı.");

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
            return Failure(ErrorType.Validation, "Erp.ExportConfigurationInvalid", ex.Message);
        }

        var order = new ErpOrderDocument(
            BuildOrderNumber(_exportSettings.OrderNumberPrefix, plan.Id),
            _exportSettings.CustomerCode,
            DateTime.UtcNow,
            plan.PlanName,
            [.. exportLines.Select(l => new ErpOrderLine(ProductCodeOf(l)!, l.Quantity, l.Sku))]);

        try
        {
            var writeResult = await writer.WriteOrderAsync(
                erpSettings.ServerAddress, credentials, order, cancellationToken);

            // Zaten var: mukerrer kayit uretilmez, plan aktarilmis sayilir.
            return Result<int>.Success(
                writeResult.WrittenLineCount,
                writeResult.AlreadyExisted
                    ? $"Sipariş {order.OrderNumber} ERP'de zaten mevcut; yeni kayıt oluşturulmadı."
                    : $"Sipariş {order.OrderNumber} ERP'ye aktarıldı.");
        }
        catch (ErpConfigurationException ex)
        {
            return Failure(ErrorType.Validation, "Erp.ExportConfigurationInvalid", ex.Message);
        }
        catch (DbException ex)
        {
            // Teknik hata: gecici olabilir, job yeniden dener.
            return Failure(ErrorType.Unexpected, "Erp.ExportWriteFailed",
                $"ERP'ye sipariş yazılırken hata oluştu: {ex.Message}");
        }
    }

    /// <summary>
    /// Plan kimliginden deterministik siparis numarasi; ayni plan her denemede ayni
    /// numarayi uretir ve idempotency bunun uzerine kurulur.
    /// </summary>
    internal static string BuildOrderNumber(string? prefix, Guid planId)
    {
        var segment = planId.ToString("N", CultureInfo.InvariantCulture)[..PlanIdSegmentLength]
            .ToUpperInvariant();
        var normalizedPrefix = string.IsNullOrWhiteSpace(prefix) ? "CP" : prefix.Trim();
        return $"{normalizedPrefix}-{segment}";
    }

    private static string? ProductCodeOf(PlanErpExportLine line) =>
        string.IsNullOrWhiteSpace(line.ErpId) ? line.Sku : line.ErpId;

    private static Result<int> Failure(ErrorType type, string code, string description) =>
        Result<int>.Failure(new Error(type, code, description));

    private static string ProviderDisplayName(ErpProviderType providerType) => providerType switch
    {
        ErpProviderType.Logo => "Logo",
        ErpProviderType.Netsis => "Netsis",
        _ => "Seçili ERP"
    };
}
