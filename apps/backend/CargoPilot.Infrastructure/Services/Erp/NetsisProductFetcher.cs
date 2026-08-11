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

    public async Task<ErpFetchResult> FetchAsync(
        string serverAddress,
        ErpCredentials credentials,
        string? categoryFilter,
        string? warehouseFilter,
        CancellationToken cancellationToken = default)
    {
        var connectionString = ErpSqlConnection.Build(serverAddress, credentials);
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

        var totals = await ReadTotalsAsync(reader, cancellationToken);
        await reader.NextResultAsync(cancellationToken);

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

        return new ErpFetchResult(results, totals.SourceTotal, BuildDroppedAtSource(totals));
    }

    /// <summary>
    /// Kaynak toplami ve neden bazli eleme sayilari ayni SQL partisinin ilk sonucundan
    /// okunur; ikinci bir COUNT gidis-donusu yoktur.
    /// </summary>
    private static async Task<SourceTotals> ReadTotalsAsync(SqlDataReader reader, CancellationToken cancellationToken)
    {
        if (!await reader.ReadAsync(cancellationToken))
            return new SourceTotals(0, 0, 0, 0);

        return new SourceTotals(
            SourceTotal: await ReadCountAsync(reader, 0, cancellationToken),
            SalesLocked: await ReadCountAsync(reader, 1, cancellationToken),
            CategoryFiltered: await ReadCountAsync(reader, 2, cancellationToken),
            WarehouseFiltered: await ReadCountAsync(reader, 3, cancellationToken));
    }

    private static async Task<int> ReadCountAsync(SqlDataReader reader, int ordinal, CancellationToken cancellationToken) =>
        await reader.IsDBNullAsync(ordinal, cancellationToken) ? 0 : reader.GetInt32(ordinal);

    private static Dictionary<ErpDropReason, int> BuildDroppedAtSource(SourceTotals totals)
    {
        var dropped = new Dictionary<ErpDropReason, int>();
        AddIfPositive(dropped, ErpDropReason.SalesLocked, totals.SalesLocked);
        AddIfPositive(dropped, ErpDropReason.CategoryFiltered, totals.CategoryFiltered);
        AddIfPositive(dropped, ErpDropReason.WarehouseFiltered, totals.WarehouseFiltered);
        return dropped;
    }

    private static void AddIfPositive(Dictionary<ErpDropReason, int> dropped, ErpDropReason reason, int count)
    {
        if (count > 0)
            dropped[reason] = count;
    }

    /// <summary>
    /// Olcu koseleri SQL'de elenmez: eksik olculu satirlar 'eksik alan' isaretiyle taslaga
    /// duser (ERP-09). Satis kilitli satirlar hic cekilmez. Kategori ve depo filtresi
    /// parametreli olarak SQL'e uygulanir; bellekte ikinci bir eleme yapilmaz.
    /// Parti iki sonuc dondurur: once eleme sayilari, sonra urun satirlari. Iki ifade de
    /// ayni eleme kosullarindan uretilir ki sayim ile cekim ayrisamasin.
    /// </summary>
    internal static string BuildSql(bool hasCategoryFilter, bool hasWarehouseFilter)
    {
        const string salesLocked = "ISNULL(SATISKILIT, '') = 'E'";
        var categoryFiltered = hasCategoryFilter ? "ISNULL(GRUP_KODU, '') <> @CategoryFilter" : null;
        var warehouseFiltered = hasWarehouseFilter
            ? "ISNULL(CAST(DEPO_KODU AS NVARCHAR(50)), '') <> @WarehouseFilter"
            : null;

        // Nedenler oncelik sirasiyla ve birbirini disliyarak sayilir; boylece
        // SourceTotal = SalesLocked + CategoryFiltered + WarehouseFiltered + Eligible.
        var salesLockedCount = CountOf(salesLocked);
        var categoryCount = CountOf(categoryFiltered, Not(salesLocked));
        var warehouseCount = CountOf(warehouseFiltered, Not(salesLocked), Not(categoryFiltered));
        var eligibleCondition = Conjunction(Not(salesLocked), Not(categoryFiltered), Not(warehouseFiltered));

        return $"""
            SELECT COUNT(*) AS SourceTotal,
                   {salesLockedCount} AS SalesLocked,
                   {categoryCount} AS CategoryFiltered,
                   {warehouseCount} AS WarehouseFiltered
            FROM TBLSTSABIT;
            SELECT TOP (@MaxRowCount)
                   STOK_KODU, STOK_ADI, BIRIM_AGIRLIK, EN, BOY, GENISLIK,
                   GRUP_KODU, DEPO_KODU, BARKOD1
            FROM TBLSTSABIT
            WHERE {eligibleCondition}
            ORDER BY STOK_KODU;
            """;
    }

    /// <summary>Kosul uygulanmiyorsa sabit 0, uygulaniyorsa onceki nedenleri dislayan SUM.</summary>
    private static string CountOf(string? condition, params string?[] precedingExclusions)
    {
        if (condition is null)
            return "0";

        var full = Conjunction([.. precedingExclusions, condition]);
        return $"SUM(CASE WHEN {full} THEN 1 ELSE 0 END)";
    }

    /// <summary>NULL-guvenli olumsuzlama; kosul yoksa cumleden dusurulur.</summary>
    private static string? Not(string? condition) => condition is null ? null : $"NOT ({condition})";

    private static string Conjunction(params string?[] conditions)
    {
        var applied = conditions.Where(c => c is not null).ToArray();
        return applied.Length == 0 ? "1 = 1" : string.Join(" AND ", applied);
    }

    private sealed record SourceTotals(
        int SourceTotal,
        int SalesLocked,
        int CategoryFiltered,
        int WarehouseFiltered);

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
}
