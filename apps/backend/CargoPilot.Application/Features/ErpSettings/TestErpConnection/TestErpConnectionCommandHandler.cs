using CargoPilot.Application.Abstractions;
using CargoPilot.Application.Common.Erp;
using CargoPilot.Application.Common.Interfaces;
using CargoPilot.Application.Common.Models;
using MediatR;
using Microsoft.Extensions.Logging;
using System.Security.Cryptography;
using ErpSettingsEntity = CargoPilot.Domain.Entities.ErpSettings;

namespace CargoPilot.Application.Features.ErpSettings.TestErpConnection;

/// <summary>
/// Sifre gonderilmediyse kayitli sifreyle test eder; sifreyi bilmeyen kullanici bloklanmaz.
/// Kayitli sifre yalnizca istek kayitli baglantinin aynisini hedefliyorsa kullanilir:
/// aksi halde sifre, istekle belirlenen keyfi bir sunucuya gonderilebilirdi.
/// Test sonucu, test edilen yapilandirmanin imzasiyla birlikte kayitli ayarlara islenir.
/// </summary>
internal sealed class TestErpConnectionCommandHandler : IRequestHandler<TestErpConnectionCommand, Result<ErpConnectionTestResponse>>
{
    private static readonly Action<ILogger, string, Exception?> _logStoredPasswordWithheld =
        LoggerMessage.Define<string>(
            LogLevel.Warning,
            new EventId(1, "ErpStoredPasswordWithheld"),
            "Kayitli ERP sifresi cozulmedi: istek {ServerAddress} adresini hedefliyor, kayitli baglantidan farkli");

    private readonly IEnumerable<IErpConnector> _connectors;
    private readonly IErpSettingsRepository _settingsRepository;
    private readonly IErpPasswordProtector _passwordProtector;
    private readonly ICurrentUserService _currentUserService;
    private readonly ILogger<TestErpConnectionCommandHandler> _logger;

    public TestErpConnectionCommandHandler(
        IEnumerable<IErpConnector> connectors,
        IErpSettingsRepository settingsRepository,
        IErpPasswordProtector passwordProtector,
        ICurrentUserService currentUserService,
        ILogger<TestErpConnectionCommandHandler> logger)
    {
        _connectors = connectors;
        _settingsRepository = settingsRepository;
        _passwordProtector = passwordProtector;
        _currentUserService = currentUserService;
        _logger = logger;
    }

    public async Task<Result<ErpConnectionTestResponse>> Handle(TestErpConnectionCommand request, CancellationToken cancellationToken)
    {
        var connector = _connectors.FirstOrDefault(c => c.ProviderType == request.ProviderType);
        if (connector is null)
            return Result<ErpConnectionTestResponse>.Failure(
                new Error(ErrorType.Validation, "ErpSettings.UnsupportedProvider", "Desteklenmeyen ERP sağlayıcısı."));

        var companyId = _currentUserService.CompanyId;
        var settings = companyId is null
            ? null
            : await _settingsRepository.GetByCompanyIdAsync(companyId.Value, cancellationToken);

        var passwordResult = ResolvePassword(request, settings);
        if (passwordResult.Error is not null)
            return Result<ErpConnectionTestResponse>.Failure(passwordResult.Error);

        ErpCredentials credentials;
        try
        {
            credentials = ErpCredentials.Create(
                request.CompanyCode, request.Username, passwordResult.Password, request.TrustServerCertificate);
        }
        catch (ErpConfigurationException ex)
        {
            return Result<ErpConnectionTestResponse>.Failure(
                new Error(ErrorType.Validation, "ErpSettings.CredentialsInvalid", ex.Message));
        }

        var result = await connector.TestConnectionAsync(request.ServerAddress, credentials, cancellationToken);

        await RecordTestResultAsync(settings, request, result.IsSuccess, cancellationToken);

        var message = result.IsSuccess
            ? "Bağlantı başarılı."
            : result.ErrorMessage ?? "ERP sistemine bağlanılamadı.";

        return Result<ErpConnectionTestResponse>.Success(
            new ErpConnectionTestResponse(result.IsSuccess, message, result.Warning));
    }

    private (string? Password, Error? Error) ResolvePassword(TestErpConnectionCommand request, ErpSettingsEntity? settings)
    {
        if (!string.IsNullOrWhiteSpace(request.Password))
            return (request.Password, null);

        if (settings is null)
            return (null, new Error(
                ErrorType.Validation,
                "ErpSettings.PasswordRequired",
                "Kayıtlı bağlantı olmadığı için şifre zorunludur."));

        // Kayitli sifre yalnizca kayitli baglantinin aynisi test edilirken cozulur; sunucu,
        // kullanici, sirket kodu veya saglayicidan biri farkliysa sifre baska bir hedefe gider.
        var requestedConfigHash = ErpSettingsEntity.BuildConfigHash(
            request.ProviderType, request.CompanyCode, request.Username, request.ServerAddress);

        if (requestedConfigHash != settings.BuildCurrentConfigHash())
        {
            _logStoredPasswordWithheld(_logger, request.ServerAddress, null);
            return (null, new Error(
                ErrorType.Validation,
                "ErpSettings.PasswordRequiredForNewConfig",
                "Bağlantı bilgileri kayıtlı ayarlardan farklı. Bu ayarları test etmek için şifreyi girin."));
        }

        try
        {
            return (_passwordProtector.Unprotect(settings.PasswordEncrypted), null);
        }
        catch (CryptographicException)
        {
            return (null, new Error(
                ErrorType.Validation,
                "ErpSettings.StoredPasswordUnreadable",
                "Kayıtlı şifre okunamadı. Şifreyi tekrar girip deneyin."));
        }
    }

    /// <summary>
    /// Sonuc, test edilen yapilandirmanin imzasiyla saklanir; kayitli ayarlar sonradan
    /// degisirse arayuz bu sonucu 'guncel' saymaz.
    /// </summary>
    private async Task RecordTestResultAsync(
        ErpSettingsEntity? settings,
        TestErpConnectionCommand request,
        bool succeeded,
        CancellationToken cancellationToken)
    {
        if (settings is null)
            return;

        var testedConfigHash = ErpSettingsEntity.BuildConfigHash(
            request.ProviderType, request.CompanyCode, request.Username, request.ServerAddress);

        settings.RecordConnectionTest(succeeded, DateTime.UtcNow, testedConfigHash);
        await _settingsRepository.SaveChangesAsync(cancellationToken);
    }
}
