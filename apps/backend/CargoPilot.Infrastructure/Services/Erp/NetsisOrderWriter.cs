using System.Data;
using System.Globalization;
using System.Text;
using CargoPilot.Application.Common.Erp;
using CargoPilot.Application.Common.Interfaces;
using CargoPilot.Application.Common.Settings;
using CargoPilot.Domain.Enums;
using Microsoft.Data.SqlClient;
using Microsoft.Extensions.Options;

namespace CargoPilot.Infrastructure.Services.Erp;

/// <summary>
/// Plani Netsis standart siparis tablolarina (TBLSIPAMAS basligi + TBLSIPATRA satirlari)
/// yazar.
/// </summary>
/// <remarks>
/// Idempotency: yazim, siparis numarasi (FATIRS_NO) uzerinden serializable bir islem
/// icinde once varlik kontrolu yapar; kayit varsa hicbir satir yazilmaz. Sema sabitleri
/// (fis tipi, sube/isletme/depo kodu) ayarlardan gelir; musteri kurulumunda dogrulanana
/// kadar ozellik anahtari kapali tutulur (bkz. docs/erp-integration/erp-export-kontrati.md).
/// </remarks>
internal sealed class NetsisOrderWriter : IErpOrderWriter
{
    /// <summary>Tek INSERT ifadesine konan azami satir; SQL Server parametre limiti icin.</summary>
    internal const int LineBatchSize = 100;

    /// <summary>TBLSIPAMAS.ACIKLAMA varchar(20).</summary>
    internal const int DescriptionMaxLength = 20;

    /// <summary>TBLSIPATRA.STHAR_ACIKLAMA varchar(35).</summary>
    internal const int LineDescriptionMaxLength = 35;

    /// <summary>Netsis'te E/H = Evet/Hayir; 'H' siparisin kapatilmadigini (acik) belirtir.</summary>
    private const string NotClosed = "H";

    private const string OnayTipi = "A";

    internal const string OrderExistsSql =
        "SELECT COUNT(*) FROM TBLSIPAMAS WHERE FATIRS_NO = @FatirsNo";

    internal const string HeaderInsertSql = """
        INSERT INTO TBLSIPAMAS
            (SUBE_KODU, FTIRSIP, FATIRS_NO, CARI_KODU, TARIH, SIRANO, ONAYTIPI, ONAYNUM,
             ISLETME_KODU, KAPATILMIS, ACIKLAMA, KAYITTARIHI, FATKALEM_ADEDI, TOPLAM_MIK)
        VALUES
            (@SubeKodu, @Ftirsip, @FatirsNo, @CariKodu, @Tarih, 0, @OnayTipi, 0,
             @IsletmeKodu, @Kapatilmis, @Aciklama, @KayitTarihi, @KalemAdedi, @ToplamMiktar)
        """;

    private readonly ErpExportSettings _settings;

    public NetsisOrderWriter(IOptions<ErpExportSettings> settings)
    {
        _settings = settings.Value;
    }

    public ErpProviderType ProviderType => ErpProviderType.Netsis;

    public async Task<ErpOrderWriteResult> WriteOrderAsync(
        string serverAddress,
        ErpCredentials credentials,
        ErpOrderDocument order,
        CancellationToken cancellationToken = default)
    {
        if (order.Lines.Count == 0)
            throw new ErpConfigurationException("Aktarılacak sipariş satırı yok.");

        var connectionString = ErpSqlConnection.Build(serverAddress, credentials);

        await using var connection = new SqlConnection(connectionString);
        await connection.OpenAsync(cancellationToken);

        // Serializable: varlik kontrolu ile yazim arasinda ayni siparis numarasinin
        // ikinci kez eklenmesini engeller (es zamanli iki export denemesi).
        await using var transaction = (SqlTransaction)await connection.BeginTransactionAsync(
            IsolationLevel.Serializable, cancellationToken);

        if (await OrderExistsAsync(connection, transaction, order.OrderNumber, cancellationToken))
        {
            await transaction.RollbackAsync(cancellationToken);
            return ErpOrderWriteResult.AlreadyExists();
        }

        await InsertHeaderAsync(connection, transaction, order, cancellationToken);

        foreach (var batch in Batch(order.Lines, LineBatchSize))
            await InsertLinesAsync(connection, transaction, order, batch, cancellationToken);

        await transaction.CommitAsync(cancellationToken);
        return ErpOrderWriteResult.Written(order.Lines.Count);
    }

    private static async Task<bool> OrderExistsAsync(
        SqlConnection connection,
        SqlTransaction transaction,
        string orderNumber,
        CancellationToken cancellationToken)
    {
        await using var command = CreateCommand(connection, transaction, OrderExistsSql);
        command.Parameters.AddWithValue("@FatirsNo", orderNumber);

        var count = await command.ExecuteScalarAsync(cancellationToken);
        return count is int existing && existing > 0;
    }

    private async Task InsertHeaderAsync(
        SqlConnection connection,
        SqlTransaction transaction,
        ErpOrderDocument order,
        CancellationToken cancellationToken)
    {
        await using var command = CreateCommand(connection, transaction, HeaderInsertSql);
        command.Parameters.AddWithValue("@SubeKodu", _settings.BranchCode);
        command.Parameters.AddWithValue("@Ftirsip", _settings.DocumentType);
        command.Parameters.AddWithValue("@FatirsNo", order.OrderNumber);
        command.Parameters.AddWithValue("@CariKodu", order.CustomerCode);
        command.Parameters.AddWithValue("@Tarih", order.OrderDate);
        command.Parameters.AddWithValue("@OnayTipi", OnayTipi);
        command.Parameters.AddWithValue("@IsletmeKodu", _settings.BusinessCode);
        command.Parameters.AddWithValue("@Kapatilmis", NotClosed);
        command.Parameters.AddWithValue("@Aciklama", Truncate(order.Description, DescriptionMaxLength));
        command.Parameters.AddWithValue("@KayitTarihi", order.OrderDate);
        command.Parameters.AddWithValue("@KalemAdedi", order.Lines.Count);
        command.Parameters.AddWithValue("@ToplamMiktar", (decimal)order.Lines.Sum(l => l.Quantity));

        await command.ExecuteNonQueryAsync(cancellationToken);
    }

    private async Task InsertLinesAsync(
        SqlConnection connection,
        SqlTransaction transaction,
        ErpOrderDocument order,
        IReadOnlyList<ErpOrderLine> lines,
        CancellationToken cancellationToken)
    {
        await using var command = CreateCommand(connection, transaction, BuildLineInsertSql(lines.Count));
        command.Parameters.AddWithValue("@FisNo", order.OrderNumber);
        command.Parameters.AddWithValue("@CariKodu", order.CustomerCode);
        command.Parameters.AddWithValue("@Tarih", order.OrderDate);
        command.Parameters.AddWithValue("@Ftirsip", _settings.DocumentType);
        command.Parameters.AddWithValue("@GcKod", _settings.LineDirection);
        command.Parameters.AddWithValue("@HareketTuru", _settings.LineMovementType);
        command.Parameters.AddWithValue("@DepoKodu", _settings.WarehouseCode);
        command.Parameters.AddWithValue("@SubeKodu", _settings.BranchCode);
        command.Parameters.AddWithValue("@OnayTipi", OnayTipi);

        for (var i = 0; i < lines.Count; i++)
        {
            var suffix = i.ToString(CultureInfo.InvariantCulture);
            command.Parameters.AddWithValue($"@StokKodu{suffix}", lines[i].ProductCode);
            command.Parameters.AddWithValue($"@Miktar{suffix}", (decimal)lines[i].Quantity);
            command.Parameters.AddWithValue($"@Sira{suffix}", i + 1);
            command.Parameters.AddWithValue(
                $"@SatirAciklama{suffix}",
                Truncate(lines[i].Description, LineDescriptionMaxLength));
        }

        await command.ExecuteNonQueryAsync(cancellationToken);
    }

    /// <summary>
    /// Satir sayisi kadar VALUES satiri uretir; siparis geneli olan degerler tek
    /// parametreyle paylasilir, satira ozgu olanlar sirali adlandirilir.
    /// </summary>
    internal static string BuildLineInsertSql(int lineCount)
    {
        ArgumentOutOfRangeException.ThrowIfNegativeOrZero(lineCount);

        var values = new StringBuilder();
        for (var i = 0; i < lineCount; i++)
        {
            if (i > 0)
                values.Append(",\n    ");

            var suffix = i.ToString(CultureInfo.InvariantCulture);
            values.Append(CultureInfo.InvariantCulture, $"(@StokKodu{suffix}, @FisNo, @Miktar{suffix}, @GcKod, @Tarih, ")
                  .Append(CultureInfo.InvariantCulture, $"@Ftirsip, @HareketTuru, @DepoKodu, @CariKodu, @Sira{suffix}, ")
                  .Append(CultureInfo.InvariantCulture, $"@SubeKodu, @OnayTipi, 0, @SatirAciklama{suffix})");
        }

        return $"""
            INSERT INTO TBLSIPATRA
                (STOK_KODU, FISNO, STHAR_GCMIK, STHAR_GCKOD, STHAR_TARIH,
                 STHAR_FTIRSIP, STHAR_HTUR, DEPO_KODU, STHAR_CARIKOD, SIRA,
                 SUBE_KODU, ONAYTIPI, ONAYNUM, STHAR_ACIKLAMA)
            VALUES
                {values}
            """;
    }

    private static SqlCommand CreateCommand(SqlConnection connection, SqlTransaction transaction, string sql) =>
        new(sql, connection, transaction) { CommandTimeout = ErpSqlConnection.CommandTimeoutSeconds };

    private static string Truncate(string? value, int maxLength)
    {
        if (string.IsNullOrWhiteSpace(value))
            return string.Empty;

        return value.Length <= maxLength ? value : value[..maxLength];
    }

    private static IEnumerable<IReadOnlyList<ErpOrderLine>> Batch(IReadOnlyList<ErpOrderLine> lines, int size)
    {
        for (var start = 0; start < lines.Count; start += size)
            yield return lines.Skip(start).Take(size).ToList();
    }
}
