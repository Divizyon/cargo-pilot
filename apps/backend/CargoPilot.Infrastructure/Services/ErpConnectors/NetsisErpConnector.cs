using CargoPilot.Application.Common.Erp;
using CargoPilot.Application.Common.Interfaces;
using CargoPilot.Domain.Enums;
using Microsoft.Extensions.Logging;

namespace CargoPilot.Infrastructure.Services.ErpConnectors;

internal sealed class NetsisErpConnector : IErpConnector
{
    /// <summary>Netsis stok master'i; urun sync'inin de kaynagi.</summary>
    private static readonly ErpSchemaProbe SchemaProbe = new(
        "SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'TBLSTSABIT'",
        "Bağlantı açıldı ancak beklenen ERP şeması bulunamadı (TBLSTSABIT). Veritabanı adını ve sağlayıcı seçimini kontrol edin.");

    private readonly ILogger<NetsisErpConnector> _logger;

    public NetsisErpConnector(ILogger<NetsisErpConnector> logger)
    {
        _logger = logger;
    }

    public ErpProviderType ProviderType => ErpProviderType.Netsis;

    public Task<ErpConnectionResult> TestConnectionAsync(
        string serverAddress,
        ErpCredentials credentials,
        CancellationToken cancellationToken = default) =>
        SqlServerConnectionTester.TestAsync(serverAddress, credentials, SchemaProbe, _logger, cancellationToken);
}
