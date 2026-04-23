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
            var response = await client.GetAsync(
                $"http://{_endpoint}/minio/health/live",
                cancellationToken);

            return response.IsSuccessStatusCode
                ? HealthCheckResult.Healthy("MinIO erişilebilir.")
                : HealthCheckResult.Degraded($"MinIO yanıt kodu: {(int)response.StatusCode}");
        }
        catch (Exception ex)
        {
            return HealthCheckResult.Unhealthy("MinIO bağlantısı başarısız.", ex);
        }
    }
}
