using CargoPilot.Application.Common.Erp;
using CargoPilot.Infrastructure.Services.Erp;
using Microsoft.Data.SqlClient;
using Microsoft.Extensions.Logging;
using System.Globalization;

namespace CargoPilot.Infrastructure.Services.ErpConnectors;

/// <summary>
/// Beklenen ERP semasini dogrulayan sorgu ve sema bulunamadiginda gosterilecek mesaj.
/// Sorgu tek bir sayi dondurmelidir (bulunan tablo sayisi).
/// </summary>
internal sealed record ErpSchemaProbe(string CountSql, string SchemaNotFoundMessage);

/// <summary>
/// MSSQL tabanli ERP connector'larinin ortak baglanti testi: login basarili olsa bile
/// beklenen sema yoksa 'basarili' donmez, hesabin yazma yetkisi varsa uyari doner.
/// </summary>
internal static partial class SqlServerConnectionTester
{
    [LoggerMessage(
        Level = LogLevel.Warning,
        Message = "ERP bağlantı testi başarısız. SqlErrorNumber={SqlErrorNumber} ServerAddress={ServerAddress}")]
    private static partial void LogConnectionFailed(
        ILogger logger, Exception exception, int sqlErrorNumber, string serverAddress);

    /// <summary>
    /// Baglanan hesabin veritabani genelinde yazma yetkisi olup olmadigini sorar.
    /// CargoPilot yalnizca okuma yapar; yazma yetkili hesap gereksiz risk uretir.
    /// </summary>
    private const string WritePermissionSql = """
        SELECT CASE WHEN
            ISNULL(HAS_PERMS_BY_NAME(NULL, NULL, 'INSERT'), 0) = 1 OR
            ISNULL(HAS_PERMS_BY_NAME(NULL, NULL, 'UPDATE'), 0) = 1 OR
            ISNULL(HAS_PERMS_BY_NAME(NULL, NULL, 'DELETE'), 0) = 1
        THEN 1 ELSE 0 END
        """;

    internal const string WritePermissionWarning =
        "Bağlanılan SQL hesabının veritabanında yazma yetkisi var. Güvenlik için yalnızca okuma yetkisi olan (db_datareader) ayrı bir hesap önerilir.";

    public static async Task<ErpConnectionResult> TestAsync(
        string serverAddress,
        ErpCredentials credentials,
        ErpSchemaProbe schemaProbe,
        ILogger logger,
        CancellationToken cancellationToken)
    {
        try
        {
            var connectionString = ErpSqlConnection.Build(serverAddress, credentials);

            await using var conn = new SqlConnection(connectionString);
            await conn.OpenAsync(cancellationToken);

            var matchCount = await ExecuteScalarIntAsync(conn, schemaProbe.CountSql, cancellationToken);
            if (matchCount == 0)
                return new ErpConnectionResult(false, schemaProbe.SchemaNotFoundMessage);

            var warning = await TryGetWritePermissionWarningAsync(conn, cancellationToken);
            return new ErpConnectionResult(true, null, warning);
        }
        catch (ErpConfigurationException ex)
        {
            return new ErpConnectionResult(false, ex.Message);
        }
        catch (SqlException ex)
        {
            // Ham SqlException mesaji sunucu/sema detayi sizdirir; kullaniciya yalnizca
            // siniflandirilmis Turkce karsiligi doner, ayrintisi log'da kalir.
            LogConnectionFailed(logger, ex, ex.Number, serverAddress);

            return new ErpConnectionResult(false, ErpSqlErrorClassifier.Classify(ex.Number, credentials.Database));
        }
        catch (TaskCanceledException)
        {
            return new ErpConnectionResult(false, "Bağlantı zaman aşımına uğradı. Sunucu adresini kontrol edin.");
        }
    }

    /// <summary>
    /// Yetki sorgusu basarisiz olursa test sonucu bozulmaz; uyari uretilmez.
    /// </summary>
    private static async Task<string?> TryGetWritePermissionWarningAsync(
        SqlConnection conn,
        CancellationToken cancellationToken)
    {
        try
        {
            var canWrite = await ExecuteScalarIntAsync(conn, WritePermissionSql, cancellationToken);
            return canWrite == 1 ? WritePermissionWarning : null;
        }
        catch (SqlException)
        {
            return null;
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
