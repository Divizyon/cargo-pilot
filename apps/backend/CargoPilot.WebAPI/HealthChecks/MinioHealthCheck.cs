using Microsoft.Extensions.Diagnostics.HealthChecks;

namespace CargoPilot.WebAPI.HealthChecks;

/// <summary>
/// MinIO object storage sağlık kontrolü.
/// MINIO_ENDPOINT ortam değişkeninden okur ve /minio/health/live endpoint'ini kontrol eder.
/// </summary>
public sealed class MinioHealthCheck : IHealthCheck
{
    private readonly IHttpClientFactory _httpClientFactory;
    private readonly string _endpoint;

    public MinioHealthCheck(IHttpClientFactory httpClientFactory, IConfiguration configuration)
    {
        _httpClientFactory = httpClientFactory;
        _endpoint = configuration["MINIO_ENDPOINT"] ?? "minio:9000";
    }

    public async Task<HealthCheckResult> CheckHealthAsync(
        HealthCheckContext context,
        CancellationToken cancellationToken = default)
    {
        try
        {
            var client = _httpClientFactory.CreateClient("minio-health");
            // S5332: MinIO saglik ucu kume ici agda duz HTTP ile dinler. Istek konteyner
            // agindan disari cikmaz; TLS sonlandirmasi reverse proxy katmaninda yapilir.
#pragma warning disable S5332
            var response = await client.GetAsync(
                $"http://{_endpoint}/minio/health/live",
                cancellationToken);
#pragma warning restore S5332

            return response.IsSuccessStatusCode
                ? HealthCheckResult.Healthy("MinIO erişilebilir.")
                : new HealthCheckResult(context.Registration.FailureStatus, $"MinIO yanıt kodu: {(int)response.StatusCode}");
        }
        catch (Exception ex)
        {
            return new HealthCheckResult(context.Registration.FailureStatus, "MinIO bağlantısı başarısız.", ex);
        }
    }
}
