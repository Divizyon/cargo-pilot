using CargoPilot.Application.Abstractions;
using CargoPilot.Application.Abstractions.Persistence;
using CargoPilot.Infrastructure.HealthChecks;
using CargoPilot.Infrastructure.Persistence;
using CargoPilot.Infrastructure.Persistence.Repositories;
using CargoPilot.Infrastructure.Services;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Diagnostics.HealthChecks;

namespace CargoPilot.Infrastructure;

public static class DependencyInjection {
    public static IServiceCollection AddInfrastructure(
        this IServiceCollection services,
        IConfiguration configuration,
        bool useInMemoryRepository = false) {
        services.AddScoped<ICurrentUserService, AnonymousCurrentUserService>();

        if (useInMemoryRepository) {
            services.AddSingleton<ICargoRepository, InMemoryCargoRepository>();
        }
        else {
            services.AddDbContext<AppDbContext>(options =>
                options.UseSqlServer(
                    configuration.GetConnectionString("DefaultConnection"),
                    sqlOptions => sqlOptions.EnableRetryOnFailure(
                        maxRetryCount: 5,
                        maxRetryDelay: TimeSpan.FromSeconds(30),
                        errorNumbersToAdd: null)));

            services.AddScoped<ICargoRepository, CargoRepository>();

            // Veritabanı sağlık kontrolü (yalnızca gerçek DB kullanıldığında)
            services.AddScoped<DatabaseHealthCheck>();
        }

        return services;
    }

    /// <summary>
    /// Veritabanı sağlık kontrolünü health check builder'a ekler.
    /// Yalnızca in-memory repository kullanılmıyorsa çağrılmalıdır.
    /// </summary>
    public static IHealthChecksBuilder AddDatabaseHealthCheck(
        this IHealthChecksBuilder builder) =>
        builder.AddCheck<DatabaseHealthCheck>(
            "database",
            failureStatus: HealthStatus.Unhealthy,
            tags: ["db", "infrastructure"]);
}
