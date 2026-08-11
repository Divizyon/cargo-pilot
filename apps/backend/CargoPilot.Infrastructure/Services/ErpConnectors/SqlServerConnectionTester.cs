using CargoPilot.Application.Common.Erp;
using CargoPilot.Infrastructure.Services.Erp;
using Microsoft.Data.SqlClient;
using System.Globalization;

namespace CargoPilot.Infrastructure.Services.ErpConnectors;

/// <summary>
/// Beklenen ERP semasini dogrulayan sorgu ve sema bulunamadiginda gosterilecek mesaj.
/// Sorgu tek bir sayi dondurmelidir (bulunan tablo sayisi).
/// </summary>
internal sealed record ErpSchemaProbe(string CountSql, string SchemaNotFoundMessage);

/// <summary>
/// MSSQL tabanli ERP connector'larinin ortak baglanti testi: login basarili olsa bile
/// beklenen sema yoksa 'basarili' donmez.
/// </summary>
internal static class SqlServerConnectionTester
{
    public static async Task<ErpConnectionResult> TestAsync(
        string serverAddress,
        string database,
        string username,
        string password,
        ErpSchemaProbe schemaProbe,
        CancellationToken cancellationToken)
    {
        try
        {
            var connectionString = ErpSqlConnection.Build(serverAddress, database, username, password);

            await using var conn = new SqlConnection(connectionString);
            await conn.OpenAsync(cancellationToken);

            await using var cmd = new SqlCommand(schemaProbe.CountSql, conn)
            {
                CommandTimeout = ErpSqlConnection.CommandTimeoutSeconds
            };
            var scalar = await cmd.ExecuteScalarAsync(cancellationToken);
            var matchCount = scalar is null or DBNull
                ? 0
                : Convert.ToInt32(scalar, CultureInfo.InvariantCulture);

            return matchCount > 0
                ? new ErpConnectionResult(true, null)
                : new ErpConnectionResult(false, schemaProbe.SchemaNotFoundMessage);
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
