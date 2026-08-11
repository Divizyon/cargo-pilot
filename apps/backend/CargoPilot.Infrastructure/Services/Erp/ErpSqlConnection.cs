using Microsoft.Data.SqlClient;

namespace CargoPilot.Infrastructure.Services.Erp;

/// <summary>
/// ERP MSSQL baglantilarinin tek kurulum noktasi: connector'lar ve fetcher'lar ayni
/// timeout ve sifreleme ayarlarini kullanir.
/// </summary>
/// <remarks>
/// <c>TrustServerCertificate=true</c> bilinerek aciktir: musteri ERP sunucularinda cogunlukla
/// self-signed sertifika bulunur. Sertifika dogrulamasini ayara baglamak ERP-22 kapsamindadir.
/// Baglanti icin salt-okunur bir SQL login'i onerilir; 'sa' gibi tam yetkili hesap kullanilmamalidir.
/// </remarks>
internal static class ErpSqlConnection
{
    public const int ConnectTimeoutSeconds = 15;
    public const int CommandTimeoutSeconds = 120;

    public static string Build(string serverAddress, string database, string userId, string password) =>
        new SqlConnectionStringBuilder
        {
            DataSource = serverAddress,
            InitialCatalog = database,
            UserID = userId,
            Password = password,
            TrustServerCertificate = true,
            Encrypt = true,
            ConnectTimeout = ConnectTimeoutSeconds
        }.ConnectionString;
}
