using CargoPilot.Application.Common.Erp;
using Microsoft.Data.SqlClient;

namespace CargoPilot.Infrastructure.Services.Erp;

/// <summary>
/// ERP MSSQL baglantilarinin tek kurulum noktasi: connector'lar ve fetcher'lar ayni
/// timeout ve sifreleme ayarlarini kullanir.
/// </summary>
/// <remarks>
/// Sertifika dogrulamasi ayara baglidir (<see cref="ErpCredentials.TrustServerCertificate"/>);
/// varsayilani true'dur cunku musteri ERP sunucularinda cogunlukla self-signed sertifika
/// bulunur. Baglanti icin salt-okunur bir SQL login'i onerilir; 'sa' gibi tam yetkili
/// hesap kullanilmamalidir (bkz. docs/erp-integration/adr-baglanti-mimarisi.md).
/// </remarks>
internal static class ErpSqlConnection
{
    public const int ConnectTimeoutSeconds = 15;
    public const int CommandTimeoutSeconds = 120;

    public static string Build(string serverAddress, ErpCredentials credentials)
    {
        if (string.IsNullOrWhiteSpace(serverAddress))
            throw new ErpConfigurationException("ERP sunucu adresi tanımlı değil. ERP ayarlarını tamamlayın.");

        return new SqlConnectionStringBuilder
        {
            DataSource = serverAddress,
            InitialCatalog = credentials.Database,
            UserID = credentials.UserId,
            Password = credentials.Password,
            TrustServerCertificate = credentials.TrustServerCertificate,
            Encrypt = true,
            ConnectTimeout = ConnectTimeoutSeconds
        }.ConnectionString;
    }
}
