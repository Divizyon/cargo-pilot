using System.Reflection;
using System.Text.Json;
using CargoPilot.WebAPI.HealthChecks;
using CargoPilot.WebAPI.Middlewares;
using Microsoft.AspNetCore.Diagnostics.HealthChecks;
using Microsoft.Extensions.Diagnostics.HealthChecks;
using Microsoft.OpenApi;
using Prometheus;

namespace CargoPilot.WebAPI;

public static class DependencyInjection {
    private static readonly JsonSerializerOptions _healthJsonOptions = new()
    {
        PropertyNamingPolicy   = JsonNamingPolicy.CamelCase,
        WriteIndented          = false,
        DefaultIgnoreCondition = System.Text.Json.Serialization.JsonIgnoreCondition.WhenWritingNull
    };
    public static IServiceCollection AddPresentation(
        this IServiceCollection services,
        bool useInMemoryRepository = false)
    {
        services.AddTransient<GlobalExceptionMiddleware>();

        services.AddControllers().AddJsonOptions(options =>
        {
            options.JsonSerializerOptions.PropertyNamingPolicy = System.Text.Json.JsonNamingPolicy.CamelCase;
        });
        services.AddEndpointsApiExplorer();
        services.AddSwaggerGen(options =>
        {
            options.SwaggerDoc("v1", new OpenApiInfo
            {
                Title = "CargoPilot API",
                Version = "v1",
                Description = "CargoPilot uygulamasının REST API dokümantasyonu."
            });

            // XML yorum dosyasını Swagger'a dahil et
            var xmlFile = $"{Assembly.GetExecutingAssembly().GetName().Name}.xml";
            var xmlPath = Path.Combine(AppContext.BaseDirectory, xmlFile);
            if (File.Exists(xmlPath))
                options.IncludeXmlComments(xmlPath);

            // JWT Bearer auth iskelet tanımı (auth implemente edildiğinde devreye alınacak)
            options.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme
            {
                Name = "Authorization",
                Type = SecuritySchemeType.Http,
                Scheme = "Bearer",
                BearerFormat = "JWT",
                In = ParameterLocation.Header,
                Description = "JWT token girin. Örnek: Bearer {token}"
            });

            options.AddSecurityRequirement(_ => new OpenApiSecurityRequirement
            {
                {
                    new OpenApiSecuritySchemeReference("Bearer"),
                    new List<string>()
                }
            });
        });

        // HttpClient — MinIO sağlık kontrolü için
        services.AddHttpClient("minio-health")
            .ConfigureHttpClient(c => c.Timeout = TimeSpan.FromSeconds(5));

        // MinIO sağlık kontrolü her zaman kayıtlı
        services.AddScoped<MinioHealthCheck>();

        // Sağlık kontrolleri
        var healthChecks = services.AddHealthChecks()
            .AddCheck<MinioHealthCheck>(
                "minio",
                failureStatus: HealthStatus.Degraded,
                tags: ["storage", "infrastructure"]);

        // Veritabanı sağlık kontrolü yalnızca gerçek DB kullanıldığında
        if (!useInMemoryRepository)
        {
            services.AddScoped<DatabaseHealthCheck>();
            healthChecks.AddCheck<DatabaseHealthCheck>(
                "database",
                failureStatus: HealthStatus.Degraded,
                tags: ["db", "infrastructure"]);
        }

        return services;
    }

    public static WebApplication UsePresentation(this WebApplication app)
    {
        app.UseMiddleware<GlobalExceptionMiddleware>();

        // Production dışındaki tüm ortamlarda (Development, Staging) Swagger aktif
        if (!app.Environment.IsProduction())
        {
            app.UseSwagger();
            app.UseSwaggerUI(options =>
            {
                options.SwaggerEndpoint("/swagger/v1/swagger.json", "CargoPilot API");
                options.RoutePrefix = "swagger";
            });
        }

        app.UseHttpMetrics();
        app.UseAuthorization();
        app.MapControllers();
        app.MapMetrics("/metrics");

        // Özet health endpoint — sadece Healthy/Unhealthy (yük dengeleyici için)
        app.MapHealthChecks("/health", new HealthCheckOptions
        {
            ResultStatusCodes =
            {
                [HealthStatus.Healthy]   = StatusCodes.Status200OK,
                [HealthStatus.Degraded]  = StatusCodes.Status200OK,
                [HealthStatus.Unhealthy] = StatusCodes.Status503ServiceUnavailable,
            }
        });

        // Detaylı health endpoint — bileşen bazında JSON (izleme araçları için)
        app.MapHealthChecks("/health/detail", new HealthCheckOptions
        {
            ResultStatusCodes =
            {
                [HealthStatus.Healthy]   = StatusCodes.Status200OK,
                [HealthStatus.Degraded]  = StatusCodes.Status200OK,
                [HealthStatus.Unhealthy] = StatusCodes.Status503ServiceUnavailable,
            },
            ResponseWriter = WriteDetailedHealthResponse
        });

        return app;
    }

    /// <summary>
    /// Bileşen bazında detaylı sağlık durumu JSON olarak döndürür.
    /// </summary>
    private static async Task WriteDetailedHealthResponse(
        HttpContext context,
        HealthReport report)
    {
        context.Response.ContentType = "application/json; charset=utf-8";

        var result = new
        {
            status = report.Status.ToString(),
            totalDurationMs = report.TotalDuration.TotalMilliseconds,
            checks = report.Entries.Select(e => new
            {
                name        = e.Key,
                status      = e.Value.Status.ToString(),
                description = e.Value.Description,
                durationMs  = e.Value.Duration.TotalMilliseconds,
                tags        = e.Value.Tags,
                error       = e.Value.Exception?.Message
            })
        };

        await context.Response.WriteAsync(
            JsonSerializer.Serialize(result, _healthJsonOptions));
    }
}
