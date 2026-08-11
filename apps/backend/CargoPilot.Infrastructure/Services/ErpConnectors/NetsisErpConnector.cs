using CargoPilot.Application.Common.Erp;
using CargoPilot.Application.Common.Interfaces;
using CargoPilot.Domain.Enums;

namespace CargoPilot.Infrastructure.Services.ErpConnectors;

internal sealed class NetsisErpConnector : IErpConnector
{
    /// <summary>Netsis stok master'i; urun sync'inin de kaynagi.</summary>
    private static readonly ErpSchemaProbe SchemaProbe = new(
        "SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'TBLSTSABIT'",
        "Bağlantı açıldı ancak beklenen ERP şeması bulunamadı (TBLSTSABIT). Veritabanı adını ve sağlayıcı seçimini kontrol edin.");

    public ErpProviderType ProviderType => ErpProviderType.Netsis;

    public Task<ErpConnectionResult> TestConnectionAsync(
        string serverAddress,
        string companyCode,
        string username,
        string password,
        CancellationToken cancellationToken = default) =>
        SqlServerConnectionTester.TestAsync(
            serverAddress, companyCode, username, password, SchemaProbe, cancellationToken);
}
