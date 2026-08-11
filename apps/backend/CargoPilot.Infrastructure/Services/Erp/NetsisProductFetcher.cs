using CargoPilot.Application.Common.Erp;
using CargoPilot.Application.Common.Interfaces;
using CargoPilot.Domain.Entities;
using CargoPilot.Domain.Enums;
using Microsoft.Data.SqlClient;
using Microsoft.Extensions.Logging;
using System.Globalization;
using System.Text.Json;

namespace CargoPilot.Infrastructure.Services.Erp;

/// <summary>Netsis stok master'i (TBLSTSABIT) uzerinden urun ceker.</summary>
internal sealed class NetsisProductFetcher : IErpProductFetcher
{
    /// <summary>Tek sync'te cekilen azami satir; bellek ve islem suresini sinirlar.</summary>
    internal const int MaxRowCount = 20000;

    private static readonly Action<ILogger, int, Exception?> _logRowLimitReached =
        LoggerMessage.Define<int>(
            LogLevel.Warning,
            new EventId(1, "ErpFetchRowLimitReached"),
            "Netsis urun cekimi {MaxRowCount} satir limitine ulasti; kalan satirlar bu sync'e alinmadi.");

    private readonly ILogger<NetsisProductFetcher> _logger;

    public NetsisProductFetcher(ILogger<NetsisProductFetcher> logger)
    {
        _logger = logger;
    }

    public ErpProviderType ProviderType => ErpProviderType.Netsis;

    public async Task<IReadOnlyList<ErpProductDto>> FetchAsync(
        string apiEndpoint,
        string? authCredentialsJson,
        string? categoryFilter,
        string? warehouseFilter,
        CancellationToken cancellationToken = default)
    {
        var connectionString = BuildConnectionString(apiEndpoint, authCredentialsJson);
        var sql = BuildSql(categoryFilter is not null, warehouseFilter is not null);

        var results = new List<ErpProductDto>();

        await using var conn = new SqlConnection(connectionString);
        await conn.OpenAsync(cancellationToken);

        await using var cmd = new SqlCommand(sql, conn)
        {
            CommandTimeout = ErpSqlConnection.CommandTimeoutSeconds
        };
        cmd.Parameters.AddWithValue("@MaxRowCount", MaxRowCount);
        if (categoryFilter is not null)
            cmd.Parameters.AddWithValue("@CategoryFilter", categoryFilter);
        if (warehouseFilter is not null)
            cmd.Parameters.AddWithValue("@WarehouseFilter", warehouseFilter);

        await using var reader = await cmd.ExecuteReaderAsync(cancellationToken);

        while (await reader.ReadAsync(cancellationToken))
        {
            var stokKodu = reader.GetString(0);
            var stokAdi = await reader.IsDBNullAsync(1, cancellationToken) ? stokKodu : reader.GetString(1);
            var weight = await reader.IsDBNullAsync(2, cancellationToken) ? 0m : reader.GetDecimal(2);
            var width = await reader.IsDBNullAsync(3, cancellationToken) ? 0m : reader.GetDecimal(3);
            var depth = await reader.IsDBNullAsync(4, cancellationToken) ? 0m : reader.GetDecimal(4);
            var height = await reader.IsDBNullAsync(5, cancellationToken) ? 0m : reader.GetDecimal(5);
            var grupKodu = await reader.IsDBNullAsync(6, cancellationToken) ? null : reader.GetString(6);
            var depoKodu = await reader.IsDBNullAsync(7, cancellationToken)
                ? null
                : reader.GetInt32(7).ToString(CultureInfo.InvariantCulture);
            var barkod = await reader.IsDBNullAsync(8, cancellationToken) ? null : reader.GetString(8);

            var rawData = new
            {
                StokKodu = stokKodu,
                StokAdi = stokAdi,
                En = width,
                Boy = depth,
                Genislik = height,
                BirimAgirlik = weight,
                GrupKodu = grupKodu,
                DepoKodu = depoKodu
            };

            results.Add(new ErpProductDto(
                ErpId: stokKodu,
                Sku: stokKodu,
                Name: stokAdi,
                ProductType: "General",
                Width: width,
                Height: height,
                Length: depth,
                Weight: weight,
                Category: grupKodu,
                Warehouse: depoKodu,
                Barcode: barkod,
                Diameter: null,
                ErpConstraints: new Dictionary<string, string?>(),
                RawDataJson: JsonSerializer.Serialize(rawData),
                MissingFields: CollectMissingFields(width, height, depth, weight)));
        }

        if (results.Count >= MaxRowCount)
            _logRowLimitReached(_logger, MaxRowCount, null);

        return results;
    }

    /// <summary>
    /// Olcu koseleri SQL'de elenmez: eksik olculu satirlar 'eksik alan' isaretiyle taslaga
    /// duser (ERP-09). Satis kilitli satirlar hic cekilmez. Kategori ve depo filtresi
    /// parametreli olarak SQL'e uygulanir; bellekte ikinci bir eleme yapilmaz.
    /// </summary>
    internal static string BuildSql(bool hasCategoryFilter, bool hasWarehouseFilter)
    {
        var sql = """
            SELECT TOP (@MaxRowCount)
                   STOK_KODU, STOK_ADI, BIRIM_AGIRLIK, EN, BOY, GENISLIK,
                   GRUP_KODU, DEPO_KODU, BARKOD1
            FROM TBLSTSABIT
            WHERE (SATISKILIT IS NULL OR SATISKILIT != 'E')
            """;

        if (hasCategoryFilter)
            sql += " AND GRUP_KODU = @CategoryFilter";

        if (hasWarehouseFilter)
            sql += " AND CAST(DEPO_KODU AS NVARCHAR(50)) = @WarehouseFilter";

        // TOP deterministik olsun diye sabit siralama.
        return sql + " ORDER BY STOK_KODU";
    }

    /// <summary>Kaynakta bos veya sifir gelen olcu/agirlik alanlarini isaretler.</summary>
    private static List<string> CollectMissingFields(
        decimal width,
        decimal height,
        decimal depth,
        decimal weight)
    {
        var missing = new List<string>();
        if (width <= 0) missing.Add(DraftItemField.Width);
        if (height <= 0) missing.Add(DraftItemField.Height);
        if (depth <= 0) missing.Add(DraftItemField.Length);
        if (weight <= 0) missing.Add(DraftItemField.Weight);
        return missing;
    }

    /// <summary>
    /// Eksik yapilandirmada varsayilan sunucu/veritabani/kullanici uydurulmaz; kullaniciya
    /// gosterilebilir bir yapilandirma hatasi firlatilir.
    /// </summary>
    internal static string BuildConnectionString(string serverAddress, string? authCredentialsJson)
    {
        if (string.IsNullOrWhiteSpace(serverAddress))
            throw new ErpConfigurationException("ERP sunucu adresi tanımlı değil. ERP ayarlarını tamamlayın.");

        if (string.IsNullOrWhiteSpace(authCredentialsJson))
            throw new ErpConfigurationException("ERP kimlik bilgileri okunamadı. ERP ayarlarını tamamlayın.");

        ErpAuthCredentials? credentials;
        try
        {
            credentials = JsonSerializer.Deserialize<ErpAuthCredentials>(authCredentialsJson);
        }
        catch (JsonException ex)
        {
            throw new ErpConfigurationException("ERP kimlik bilgileri okunamadı. ERP ayarlarını tamamlayın.", ex);
        }

        if (credentials is null)
            throw new ErpConfigurationException("ERP kimlik bilgileri okunamadı. ERP ayarlarını tamamlayın.");

        if (string.IsNullOrWhiteSpace(credentials.Database))
            throw new ErpConfigurationException("ERP veritabanı adı tanımlı değil. ERP ayarlarından veritabanı adını girin.");

        if (string.IsNullOrWhiteSpace(credentials.UserId))
            throw new ErpConfigurationException("ERP kullanıcı adı tanımlı değil. ERP ayarlarından kullanıcı adını girin.");

        if (string.IsNullOrWhiteSpace(credentials.Password))
            throw new ErpConfigurationException("ERP parolası tanımlı değil. ERP ayarlarından parolayı girin.");

        return ErpSqlConnection.Build(serverAddress, credentials.Database, credentials.UserId, credentials.Password);
    }

    private sealed record ErpAuthCredentials(
        string? Database,
        string? UserId,
        string? Password);
}
