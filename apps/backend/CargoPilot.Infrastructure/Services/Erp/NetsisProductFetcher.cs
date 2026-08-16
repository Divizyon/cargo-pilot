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
    /// <summary>
    /// Tek sync'te cekilen azami satir; bellek ve islem suresini sinirlar. Bu tavan
    /// asilirsa kalan satirlar <see cref="ErpDropReason.RowLimitExceeded"/> olarak sayilir.
    /// </summary>
    internal const int MaxRowCount = 50000;

    /// <summary>
    /// Tek gidis-donuste okunan satir. Tablo tek TOP penceresiyle degil, STOK_KODU
    /// uzerinden keyset ilerleyerek taranir: sabit pencere kullanildiginda siralamanin
    /// kuyrugundaki satirlar her sync'te ayni sekilde disarida kalir ve sisteme hic girmezdi.
    /// </summary>
    internal const int BatchSize = 2000;

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
        var hasCategoryFilter = categoryFilter is not null;
        var hasWarehouseFilter = warehouseFilter is not null;

        await using var conn = new SqlConnection(connectionString);
        await conn.OpenAsync(cancellationToken);

        var totals = await ReadTotalsAsync(
            conn, BuildTotalsSql(hasCategoryFilter, hasWarehouseFilter),
            categoryFilter, warehouseFilter, cancellationToken);

        var results = new List<ErpProductDto>();
        var pageSql = BuildPageSql(hasCategoryFilter, hasWarehouseFilter);
        var lastStokKodu = string.Empty;

        // Her tur bir onceki turun son STOK_KODU'sundan devam eder. OFFSET yerine keyset:
        // tablo sync sirasinda degisse bile satir atlanmaz ve derin sayfalarda maliyet artmaz.
        while (results.Count < MaxRowCount)
        {
            var readCount = await ReadPageAsync(
                conn, pageSql, categoryFilter, warehouseFilter, lastStokKodu, results, cancellationToken);

            if (readCount == 0)
                break;

            lastStokKodu = results[^1].ErpId;

            // Eksik dolu parti tablonun sonudur; fazladan bir bos sorgu atilmaz.
            if (readCount < BatchSize)
                break;
        }

        if (results.Count >= MaxRowCount)
            _logRowLimitReached(_logger, MaxRowCount, null);

        return new ErpFetchResult(results, totals.SourceTotal, BuildDroppedAtSource(totals, results.Count));
    }

    /// <summary>Tek partiyi okur ve <paramref name="results"/> sonuna ekler; okunan satir sayisini doner.</summary>
    private static async Task<int> ReadPageAsync(
        SqlConnection conn,
        string pageSql,
        string? categoryFilter,
        string? warehouseFilter,
        string lastStokKodu,
        List<ErpProductDto> results,
        CancellationToken cancellationToken)
    {
        await using var cmd = new SqlCommand(pageSql, conn)
        {
            CommandTimeout = ErpSqlConnection.CommandTimeoutSeconds
        };
        cmd.Parameters.AddWithValue("@BatchSize", BatchSize);
        cmd.Parameters.AddWithValue("@AfterStokKodu", lastStokKodu);
        AddFilterParameters(cmd, categoryFilter, warehouseFilter);

        await using var reader = await cmd.ExecuteReaderAsync(cancellationToken);

        var readCount = 0;
        while (await reader.ReadAsync(cancellationToken))
        {
            results.Add(await ReadProductAsync(reader, cancellationToken));
            readCount++;
        }

        return readCount;
    }

    private static async Task<ErpProductDto> ReadProductAsync(
        SqlDataReader reader,
        CancellationToken cancellationToken)
    {
        var stokKodu = reader.GetString(0);
        var stokAdi = await reader.IsDBNullAsync(1, cancellationToken) ? stokKodu : reader.GetString(1);
        var weight = await reader.IsDBNullAsync(2, cancellationToken) ? 0m : reader.GetDecimal(2);
        var width = await reader.IsDBNullAsync(3, cancellationToken) ? 0m : reader.GetDecimal(3);
        var length = await reader.IsDBNullAsync(4, cancellationToken) ? 0m : reader.GetDecimal(4);
        var height = await reader.IsDBNullAsync(5, cancellationToken) ? 0m : reader.GetDecimal(5);
        var grupKodu = await reader.IsDBNullAsync(6, cancellationToken) ? null : reader.GetString(6);
        var depoKodu = await reader.IsDBNullAsync(7, cancellationToken)
            ? null
            : reader.GetInt32(7).ToString(CultureInfo.InvariantCulture);
        var barkod = await reader.IsDBNullAsync(8, cancellationToken) ? null : reader.GetString(8);

        // Cekilen her kolon anlik goruntuye girer: taslagin ERP tarafinda degisip
        // degismedigi bu JSON karsilastirilarak anlasilir (DraftItem.MatchesErpSnapshot),
        // eksik birakilan kolonun degisimi fark edilmezdi.
        var rawData = new
        {
            StokKodu = stokKodu,
            StokAdi = stokAdi,
            En = width,
            Boy = length,
            Genislik = height,
            BirimAgirlik = weight,
            GrupKodu = grupKodu,
            DepoKodu = depoKodu,
            Barkod = barkod
        };

        return new ErpProductDto(
            ErpId: stokKodu,
            Sku: stokKodu,
            Name: stokAdi,
            ProductType: "General",
            Width: width,
            Height: height,
            Length: length,
            Weight: weight,
            GroupCode: grupKodu,
            Warehouse: depoKodu,
            Barcode: barkod,
            Diameter: null,
            ErpConstraints: new Dictionary<string, string?>(),
            RawDataJson: JsonSerializer.Serialize(rawData),
            MissingFields: CollectMissingFields(width, height, length, weight));
    }

    private static void AddFilterParameters(SqlCommand cmd, string? categoryFilter, string? warehouseFilter)
    {
        if (categoryFilter is not null)
            cmd.Parameters.AddWithValue("@CategoryFilter", categoryFilter);
        if (warehouseFilter is not null)
            cmd.Parameters.AddWithValue("@WarehouseFilter", warehouseFilter);
    }

    /// <summary>
    /// Kaynak toplami ve neden bazli eleme sayilari ayni SQL partisinin ilk sonucundan
    /// okunur; ikinci bir COUNT gidis-donusu yoktur.
    /// </summary>
    private static async Task<SourceTotals> ReadTotalsAsync(
        SqlConnection conn,
        string totalsSql,
        string? categoryFilter,
        string? warehouseFilter,
        CancellationToken cancellationToken)
    {
        await using var cmd = new SqlCommand(totalsSql, conn)
        {
            CommandTimeout = ErpSqlConnection.CommandTimeoutSeconds
        };
        AddFilterParameters(cmd, categoryFilter, warehouseFilter);

        await using var reader = await cmd.ExecuteReaderAsync(cancellationToken);

        if (!await reader.ReadAsync(cancellationToken))
            return new SourceTotals(0, 0, 0, 0, 0);

        return new SourceTotals(
            SourceTotal: await ReadCountAsync(reader, 0, cancellationToken),
            SalesLocked: await ReadCountAsync(reader, 1, cancellationToken),
            CategoryFiltered: await ReadCountAsync(reader, 2, cancellationToken),
            WarehouseFiltered: await ReadCountAsync(reader, 3, cancellationToken),
            Eligible: await ReadCountAsync(reader, 4, cancellationToken));
    }

    private static async Task<int> ReadCountAsync(SqlDataReader reader, int ordinal, CancellationToken cancellationToken) =>
        await reader.IsDBNullAsync(ordinal, cancellationToken) ? 0 : reader.GetInt32(ordinal);

    /// <summary>
    /// Kaynakta elenen satirlari neden bazli sozluge cevirir. TOP limiti yuzunden bu sync'e
    /// alinamayan satirlar da <see cref="ErpDropReason.RowLimitExceeded"/> ile sayilir ki
    /// SourceTotal = cekilen + toplam eleme esitligi bozulmasin.
    /// </summary>
    internal static Dictionary<ErpDropReason, int> BuildDroppedAtSource(SourceTotals totals, int fetchedCount)
    {
        var dropped = new Dictionary<ErpDropReason, int>();
        AddIfPositive(dropped, ErpDropReason.SalesLocked, totals.SalesLocked);
        AddIfPositive(dropped, ErpDropReason.CategoryFiltered, totals.CategoryFiltered);
        AddIfPositive(dropped, ErpDropReason.WarehouseFiltered, totals.WarehouseFiltered);
        // TOP limiti yuzunden bu sync'e alinmayan satirlar da mutabakatta gorunmeli.
        AddIfPositive(dropped, ErpDropReason.RowLimitExceeded, totals.Eligible - fetchedCount);
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
    /// <summary>
    /// Olcu koseleri SQL'de elenmez: eksik olculu satirlar 'eksik alan' isaretiyle taslaga
    /// duser (ERP-09). Satis kilitli satirlar hic cekilmez. Kategori ve depo filtresi
    /// parametreli olarak SQL'e uygulanir; bellekte ikinci bir eleme yapilmaz.
    /// </summary>
    internal static string BuildTotalsSql(bool hasCategoryFilter, bool hasWarehouseFilter)
    {
        var conditions = ScreeningConditions(hasCategoryFilter, hasWarehouseFilter);

        // Nedenler oncelik sirasiyla ve birbirini disliyarak sayilir; boylece
        // SourceTotal = SalesLocked + CategoryFiltered + WarehouseFiltered + Eligible.
        return $"""
            SELECT COUNT(*) AS SourceTotal,
                   {CountOf(conditions.SalesLocked)} AS SalesLocked,
                   {CountOf(conditions.CategoryFiltered, Not(conditions.SalesLocked))} AS CategoryFiltered,
                   {CountOf(conditions.WarehouseFiltered, Not(conditions.SalesLocked), Not(conditions.CategoryFiltered))} AS WarehouseFiltered,
                   {CountOf(conditions.Eligible)} AS Eligible
            FROM TBLSTSABIT;
            """;
    }

    /// <summary>
    /// Tek partiyi ceker. Ilerleme STOK_KODU uzerinden keyset ile yapilir: OFFSET
    /// kullanilsaydi tablo sync sirasinda degistiginde satirlar atlanabilir, derin
    /// sayfalarda maliyet de artardi.
    /// </summary>
    internal static string BuildPageSql(bool hasCategoryFilter, bool hasWarehouseFilter)
    {
        var eligible = ScreeningConditions(hasCategoryFilter, hasWarehouseFilter).Eligible;

        return $"""
            SELECT TOP (@BatchSize)
                   STOK_KODU, STOK_ADI, BIRIM_AGIRLIK, EN, BOY, GENISLIK,
                   GRUP_KODU, DEPO_KODU, BARKOD1
            FROM TBLSTSABIT
            WHERE {eligible} AND STOK_KODU > @AfterStokKodu
            ORDER BY STOK_KODU;
            """;
    }

    /// <summary>
    /// Eleme kosullari tek yerden uretilir; sayim ile cekim ayni cumleyi kullanmazsa
    /// muhasebe ile gercek satir kumesi ayrisirdi.
    /// </summary>
    private static ScreeningSql ScreeningConditions(bool hasCategoryFilter, bool hasWarehouseFilter)
    {
        const string salesLocked = "ISNULL(SATISKILIT, '') = 'E'";
        var categoryFiltered = hasCategoryFilter ? "ISNULL(GRUP_KODU, '') <> @CategoryFilter" : null;
        var warehouseFiltered = hasWarehouseFilter
            ? "ISNULL(CAST(DEPO_KODU AS NVARCHAR(50)), '') <> @WarehouseFilter"
            : null;

        return new ScreeningSql(
            salesLocked,
            categoryFiltered,
            warehouseFiltered,
            Conjunction(Not(salesLocked), Not(categoryFiltered), Not(warehouseFiltered)));
    }

    private sealed record ScreeningSql(
        string SalesLocked,
        string? CategoryFiltered,
        string? WarehouseFiltered,
        string Eligible);

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

    /// <summary>Sorgunun ilk sonucundan okunan, birbirini dislayan kaynak sayilari.</summary>
    internal sealed record SourceTotals(
        int SourceTotal,
        int SalesLocked,
        int CategoryFiltered,
        int WarehouseFiltered,
        int Eligible);

    /// <summary>Kaynakta bos veya sifir gelen olcu/agirlik alanlarini isaretler.</summary>
    private static List<string> CollectMissingFields(
        decimal width,
        decimal height,
        decimal length,
        decimal weight)
    {
        var missing = new List<string>();
        if (width <= 0) missing.Add(DraftItemField.Width);
        if (height <= 0) missing.Add(DraftItemField.Height);
        if (length <= 0) missing.Add(DraftItemField.Length);
        if (weight <= 0) missing.Add(DraftItemField.Weight);
        return missing;
    }
}
