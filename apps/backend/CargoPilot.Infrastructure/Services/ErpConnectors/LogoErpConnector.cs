using CargoPilot.Application.Common.Erp;
using CargoPilot.Application.Common.Interfaces;
using CargoPilot.Domain.Enums;
using Microsoft.Extensions.Logging;

namespace CargoPilot.Infrastructure.Services.ErpConnectors;

internal sealed class LogoErpConnector : IErpConnector
{
    /// <summary>Logo tablolari LG_ onekiyle uretilir (or. LG_001_ITEMS); sema dokumani gelene kadar desen kontrolu yapilir.</summary>
    private static readonly ErpSchemaProbe SchemaProbe = new(
        "SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME LIKE 'LG[_]%'",
        "Bağlantı açıldı ancak beklenen ERP şeması bulunamadı (LG_ tabloları). Veritabanı adını ve sağlayıcı seçimini kontrol edin.");

    private readonly ILogger<LogoErpConnector> _logger;

    public LogoErpConnector(ILogger<LogoErpConnector> logger)
    {
        _logger = logger;
    }

    public ErpProviderType ProviderType => ErpProviderType.Logo;

    public Task<ErpConnectionResult> TestConnectionAsync(
        string serverAddress,
        ErpCredentials credentials,
        CancellationToken cancellationToken = default) =>
        SqlServerConnectionTester.TestAsync(serverAddress, credentials, SchemaProbe, _logger, cancellationToken);
}
