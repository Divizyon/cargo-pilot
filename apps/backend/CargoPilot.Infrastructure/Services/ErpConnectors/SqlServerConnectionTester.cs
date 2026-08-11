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
        ErpCredentials credentials,
        ErpSchemaProbe schemaProbe,
        CancellationToken cancellationToken)
    {
        try
        {
            var connectionString = ErpSqlConnection.Build(serverAddress, credentials);

            await using var conn = new SqlConnection(connectionString);
            await conn.OpenAsync(cancellationToken);

            var matchCount = await ExecuteScalarIntAsync(conn, schemaProbe.CountSql, cancellationToken);

            return matchCount > 0
                ? new ErpConnectionResult(true, null)
                : new ErpConnectionResult(false, schemaProbe.SchemaNotFoundMessage);
        }
        catch (ErpConfigurationException ex)
        {
            return new ErpConnectionResult(false, ex.Message);
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

    private static async Task<int> ExecuteScalarIntAsync(
        SqlConnection conn,
        string sql,
        CancellationToken cancellationToken)
    {
        await using var cmd = new SqlCommand(sql, conn)
        {
            CommandTimeout = ErpSqlConnection.CommandTimeoutSeconds
        };

        var scalar = await cmd.ExecuteScalarAsync(cancellationToken);
        return scalar is null or DBNull ? 0 : Convert.ToInt32(scalar, CultureInfo.InvariantCulture);
    }
}
