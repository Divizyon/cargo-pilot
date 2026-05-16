using CargoPilot.Application.Common.Erp;
using CargoPilot.Application.Common.Interfaces;
using Microsoft.Data.SqlClient;
using System.Text.Json;

namespace CargoPilot.Infrastructure.Services;

internal sealed class SqlServerErpProductFetcher : IErpProductFetcher
{
    public async Task<IReadOnlyList<ErpProductDto>> FetchAsync(
        string apiEndpoint,
        string? authCredentialsJson,
        string? categoryFilter,
        string? warehouseFilter,
        CancellationToken cancellationToken = default)
    {
        var connectionString = BuildConnectionString(apiEndpoint, authCredentialsJson);

        var sql = """
            SELECT STOK_KODU, STOK_ADI, BIRIM_AGIRLIK, EN, BOY, GENISLIK,
                   GRUP_KODU, DEPO_KODU, BARKOD1
            FROM TBLSTSABIT
            WHERE (SATISKILIT IS NULL OR SATISKILIT != 'E')
              AND EN IS NOT NULL AND EN > 0
              AND BOY IS NOT NULL AND BOY > 0
              AND GENISLIK IS NOT NULL AND GENISLIK > 0
            """;

        if (categoryFilter is not null)
            sql += " AND GRUP_KODU = @CategoryFilter";

        var results = new List<ErpProductDto>();

        await using var conn = new SqlConnection(connectionString);
        await conn.OpenAsync(cancellationToken);

        await using var cmd = new SqlCommand(sql, conn);
        if (categoryFilter is not null)
            cmd.Parameters.AddWithValue("@CategoryFilter", categoryFilter);

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
            var depoKodu = await reader.IsDBNullAsync(7, cancellationToken) ? null : reader.GetInt32(7).ToString(System.Globalization.CultureInfo.InvariantCulture);
            var barkod = await reader.IsDBNullAsync(8, cancellationToken) ? null : reader.GetString(8);

            if (warehouseFilter is not null && depoKodu != warehouseFilter)
                continue;

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
                RawDataJson: JsonSerializer.Serialize(rawData)));
        }

        return results;
    }

    private static string BuildConnectionString(string apiEndpoint, string? authCredentialsJson)
    {
        if (authCredentialsJson is null)
            return apiEndpoint;

        try
        {
            var creds = JsonSerializer.Deserialize<ErpAuthCredentials>(authCredentialsJson);
            if (creds is null) return apiEndpoint;

            return new SqlConnectionStringBuilder
            {
                DataSource = apiEndpoint,
                InitialCatalog = creds.Database ?? "DIVIZYON",
                UserID = creds.UserId ?? "sa",
                Password = creds.Password,
                TrustServerCertificate = true,
                Encrypt = true
            }.ConnectionString;
        }
        catch
        {
            return apiEndpoint;
        }
    }

    private sealed record ErpAuthCredentials(
        string? Database,
        string? UserId,
        string Password);
}
