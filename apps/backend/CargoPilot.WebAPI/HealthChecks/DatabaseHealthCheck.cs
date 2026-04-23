using CargoPilot.Infrastructure.Persistence;
using Microsoft.Extensions.Diagnostics.HealthChecks;

namespace CargoPilot.WebAPI.HealthChecks;

/// <summary>
/// SQL Server veritabanı bağlantı sağlık kontrolü.
/// AppDbContext üzerinden basit bir sorgu çalıştırarak bağlantıyı doğrular.
/// </summary>
public sealed class DatabaseHealthCheck : IHealthCheck
{
    private readonly AppDbContext _dbContext;

    public DatabaseHealthCheck(AppDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    public async Task<HealthCheckResult> CheckHealthAsync(
        HealthCheckContext context,
        CancellationToken cancellationToken = default)
    {
        try
        {
            // Basit bağlantı testi — gerçek sorgu çalıştırır
            _ = await _dbContext.Database.ExecuteSqlRawAsync("SELECT 1", cancellationToken);
            return HealthCheckResult.Healthy("Veritabanı bağlantısı sağlıklı.");
        }
        catch (Exception ex)
        {
            return HealthCheckResult.Unhealthy("Veritabanı bağlantısı başarısız.", ex);
        }
    }
}
