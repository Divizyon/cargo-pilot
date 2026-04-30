using System.Reflection;
using System.Text;
using System.Text.Json;
using System.Threading.RateLimiting;
using CargoPilot.Application.Abstractions;
using CargoPilot.WebAPI.HealthChecks;
using CargoPilot.WebAPI.Middlewares;
using CargoPilot.WebAPI.Services;
using CargoPilot.WebAPI.Swagger;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Diagnostics.HealthChecks;
using Microsoft.Extensions.Diagnostics.HealthChecks;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi.Models;
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
        IConfiguration configuration,
        bool useInMemoryRepository = false)
    {
        services.AddRateLimiter(options =>
        {
            options.RejectionStatusCode = StatusCodes.Status429TooManyRequests;

            options.OnRejected = async (context, ct) =>
            {
                context.HttpContext.Response.ContentType = "application/json";
                await context.HttpContext.Response.WriteAsync(
                    """{"isSuccess":false,"data":null,"error":{"code":"AUTH_RATE_LIMIT_EXCEEDED","description":"Çok fazla istek gönderildi. Lütfen bekleyin."}}""",
                    ct);
            };

            // Login: 10 istek / 1 dk / IP
            options.AddPolicy("login", httpContext =>
                RateLimitPartition.GetSlidingWindowLimiter(
                    httpContext.Connection.RemoteIpAddress?.ToString() ?? "unknown",
                    _ => new SlidingWindowRateLimiterOptions
                    {
                        PermitLimit       = 10,
                        Window            = TimeSpan.FromMinutes(1),
                        SegmentsPerWindow = 2,
                        QueueLimit        = 0,
                    }));

            // Register: 5 istek / 1 dk / IP
            options.AddPolicy("register", httpContext =>
                RateLimitPartition.GetSlidingWindowLimiter(
                    httpContext.Connection.RemoteIpAddress?.ToString() ?? "unknown",
                    _ => new SlidingWindowRateLimiterOptions
                    {
                        PermitLimit       = 5,
                        Window            = TimeSpan.FromMinutes(1),
                        SegmentsPerWindow = 2,
                        QueueLimit        = 0,
                    }));

            // Password reset: 5 istek / 15 dk / IP
            options.AddPolicy("password-reset", httpContext =>
                RateLimitPartition.GetSlidingWindowLimiter(
                    httpContext.Connection.RemoteIpAddress?.ToString() ?? "unknown",
                    _ => new SlidingWindowRateLimiterOptions
                    {
                        PermitLimit       = 5,
                        Window            = TimeSpan.FromMinutes(15),
                        SegmentsPerWindow = 3,
                        QueueLimit        = 0,
                    }));
        });

        services.AddTransient<GlobalExceptionMiddleware>();

        // Override Infrastructure's AnonymousCurrentUserService with the JWT-aware implementation.
        services.AddHttpContextAccessor();
        services.AddScoped<ICurrentUserService, JwtCurrentUserService>();

        services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
            .AddJwtBearer(options =>
            {
                options.MapInboundClaims = false;
                options.TokenValidationParameters = new TokenValidationParameters
                {
                    ValidateIssuer = true,
                    ValidateAudience = true,
                    ValidateLifetime = true,
                    ValidateIssuerSigningKey = true,
                    ValidIssuer = configuration["Jwt:Issuer"],
                    ValidAudience = configuration["Jwt:Audience"],
                    IssuerSigningKey = new SymmetricSecurityKey(
                        Encoding.UTF8.GetBytes(configuration["Jwt:Secret"]!)),
                    ClockSkew = TimeSpan.Zero,
                };
            });

        services.AddControllers().AddJsonOptions(options =>
        {
            options.JsonSerializerOptions.PropertyNamingPolicy = System.Text.Json.JsonNamingPolicy.CamelCase;
        });
        services.AddEndpointsApiExplorer();
        services.AddSwaggerGen(options =>
        {
            options.OperationFilter<AuthorizeOperationFilter>();
            options.SwaggerDoc("v1", new OpenApiInfo
            {
                Title = "CargoPilot API",
                Version = "v1",
                Description = "CargoPilot uygulamasının REST API dokümantasyonu."
            });

            var xmlFile = $"{Assembly.GetExecutingAssembly().GetName().Name}.xml";
            var xmlPath = Path.Combine(AppContext.BaseDirectory, xmlFile);
            if (File.Exists(xmlPath))
                options.IncludeXmlComments(xmlPath);

            options.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme
            {
                Name = "Authorization",
                Type = SecuritySchemeType.Http,
                Scheme = "bearer",
                BearerFormat = "JWT",
                In = ParameterLocation.Header,
                Description = "JWT token girin. Örnek: Bearer {token}"
            });

            options.AddSecurityRequirement(new OpenApiSecurityRequirement
            {
                {
                    new OpenApiSecurityScheme
                    {
                        Reference = new OpenApiReference
                        {
                            Type = ReferenceType.SecurityScheme,
                            Id = "Bearer"
                        }
                    },
                    new List<string>()
                }
            });
        });

        // HttpClient — MinIO sağlık kontrolü için
        services.AddHttpClient("minio-health")
            .ConfigureHttpClient(c => c.Timeout = TimeSpan.FromSeconds(5));

        services.AddScoped<MinioHealthCheck>();

        var healthChecks = services.AddHealthChecks()
            .AddCheck<MinioHealthCheck>(
                "minio",
                failureStatus: HealthStatus.Degraded,
                tags: ["storage", "infrastructure"]);

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
        app.UseRateLimiter();
        app.UseMiddleware<GlobalExceptionMiddleware>();

        if (!app.Environment.IsProduction())
        {
            app.UseSwagger();
            app.UseSwaggerUI(options =>
            {
                options.SwaggerEndpoint("/swagger/v1/swagger.json", "CargoPilot API");
                options.RoutePrefix = "swagger";
            });
        }

        app.UseAuthentication();
        app.UseHttpMetrics();
        app.UseAuthorization();
        app.MapControllers();
        app.MapMetrics("/metrics");

        app.MapHealthChecks("/health", new HealthCheckOptions
        {
            ResultStatusCodes =
            {
                [HealthStatus.Healthy]   = StatusCodes.Status200OK,
                [HealthStatus.Degraded]  = StatusCodes.Status200OK,
                [HealthStatus.Unhealthy] = StatusCodes.Status503ServiceUnavailable,
            }
        });

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
