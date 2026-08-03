using CargoPilot.Application.Common.Erp;
using CargoPilot.Application.Common.Interfaces;
using CargoPilot.Domain.Enums;
using Microsoft.Data.SqlClient;

namespace CargoPilot.Infrastructure.Services.ErpConnectors;

internal sealed class NetsisErpConnector : IErpConnector
{
    public ErpProviderType ProviderType => ErpProviderType.Netsis;

    public async Task<ErpConnectionResult> TestConnectionAsync(
        string serverAddress,
        string companyCode,
        string username,
        string password,
        CancellationToken cancellationToken = default)
    {
        try
        {
            var connectionString = new SqlConnectionStringBuilder
            {
                DataSource = serverAddress,
                InitialCatalog = companyCode,
                UserID = username,
                Password = password,
                TrustServerCertificate = true,
                Encrypt = true,
                ConnectTimeout = 10
            }.ConnectionString;

            await using var conn = new SqlConnection(connectionString);
            await conn.OpenAsync(cancellationToken);
            return new ErpConnectionResult(true, null);
        }
        catch (SqlException ex)
        {
            return new ErpConnectionResult(false, $"Veritabanına bağlanılamadı: {ex.Message}");
        }
        catch (TaskCanceledException)
        {
            return new ErpConnectionResult(false, "Bağlantı zaman aşımına uğradı. Sunucu adresini kontrol edin.");
        }
    }
}
