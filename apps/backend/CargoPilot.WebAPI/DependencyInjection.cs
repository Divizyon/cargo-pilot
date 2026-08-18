using System.Globalization;
using System.Net;
using System.Reflection;
using System.Text;
using System.Text.Json;
using System.Threading.RateLimiting;
using CargoPilot.Application.Abstractions;
using CargoPilot.Infrastructure;
using CargoPilot.WebAPI.Authentication;
using CargoPilot.WebAPI.Filters;
using CargoPilot.WebAPI.HealthChecks;
using CargoPilot.WebAPI.Middlewares;
using CargoPilot.WebAPI.Services;
using CargoPilot.WebAPI.Swagger;
using Hangfire;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.HttpOverrides;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Diagnostics.HealthChecks;
using Microsoft.Extensions.Diagnostics.HealthChecks;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi.Models;
using Prometheus;
using IPNetwork = Microsoft.AspNetCore.HttpOverrides.IPNetwork;

namespace CargoPilot.WebAPI;

public static class DependencyInjection {
    private static readonly Action<ILogger, string, string, Exception?> _logRateLimitRejected =
        LoggerMessage.Define<string, string>(
            LogLevel.Warning,
            new EventId(1, "RateLimitRejected"),
            "Hiz siniri asildi: {Path} yolu {ClientAddress} adresinden reddedildi");

    private static readonly JsonSerializerOptions _healthJsonOptions = new()
    {
        PropertyNamingPolicy   = JsonNamingPolicy.CamelCase,
        WriteIndented          = false,
        DefaultIgnoreCondition = System.Text.Json.Serialization.JsonIgnoreCondition.WhenWritingNull
    };

    public static IServiceCollection AddPresentation(
        this IServiceCollection services,
        IConfiguration configuration,
        IHostEnvironment environment,
        bool useInMemoryRepository = false)
    {
        ArgumentNullException.ThrowIfNull(environment);

        AddForwardedHeaders(services, configuration);

        services.AddRateLimiter(options =>
        {
            options.RejectionStatusCode = StatusCodes.Status429TooManyRequests;

            options.OnRejected = async (context, ct) =>
            {
                // Reddedilen istek sessiz kalmamali: hiz siniri asilmasi cogu zaman
                // otomatik deneme veya tarama girisiminin ilk isaretidir.
                var logger = context.HttpContext.RequestServices
                    .GetRequiredService<ILoggerFactory>()
                    .CreateLogger("CargoPilot.RateLimiter");
                _logRateLimitRejected(
                    logger,
                    context.HttpContext.Request.Path,
                    context.HttpContext.Connection.RemoteIpAddress?.ToString() ?? "bilinmiyor",
                    null);

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

            // Profile update: 10 istek / 1 dk / IP
            options.AddPolicy("profile-update", httpContext =>
                RateLimitPartition.GetSlidingWindowLimiter(
                    httpContext.Connection.RemoteIpAddress?.ToString() ?? "unknown",
                    _ => new SlidingWindowRateLimiterOptions
                    {
                        PermitLimit       = 10,
                        Window            = TimeSpan.FromMinutes(1),
                        SegmentsPerWindow = 2,
                        QueueLimit        = 0,
                    }));

            // Change password: 5 istek / 15 dk / IP
            options.AddPolicy("change-password", httpContext =>
                RateLimitPartition.GetSlidingWindowLimiter(
                    httpContext.Connection.RemoteIpAddress?.ToString() ?? "unknown",
                    _ => new SlidingWindowRateLimiterOptions
                    {
                        PermitLimit       = 5,
                        Window            = TimeSpan.FromMinutes(15),
                        SegmentsPerWindow = 3,
                        QueueLimit        = 0,
                    }));

            // Email change request: 3 istek / 15 dk / IP
            options.AddPolicy("email-change-request", httpContext =>
                RateLimitPartition.GetSlidingWindowLimiter(
                    httpContext.Connection.RemoteIpAddress?.ToString() ?? "unknown",
                    _ => new SlidingWindowRateLimiterOptions
                    {
                        PermitLimit       = 3,
                        Window            = TimeSpan.FromMinutes(15),
                        SegmentsPerWindow = 3,
                        QueueLimit        = 0,
                    }));

            // Confirm email change: 10 istek / 15 dk / IP (brute-force koruması)
            options.AddPolicy("confirm-email-change", httpContext =>
                RateLimitPartition.GetSlidingWindowLimiter(
                    httpContext.Connection.RemoteIpAddress?.ToString() ?? "unknown",
                    _ => new SlidingWindowRateLimiterOptions
                    {
                        PermitLimit       = 10,
                        Window            = TimeSpan.FromMinutes(15),
                        SegmentsPerWindow = 3,
                        QueueLimit        = 0,
                    }));

            // Company user create: 20 istek / 1 dk / IP
            options.AddPolicy("company-user-create", httpContext =>
                RateLimitPartition.GetSlidingWindowLimiter(
                    httpContext.Connection.RemoteIpAddress?.ToString() ?? "unknown",
                    _ => new SlidingWindowRateLimiterOptions
                    {
                        PermitLimit       = 20,
                        Window            = TimeSpan.FromMinutes(1),
                        SegmentsPerWindow = 2,
                        QueueLimit        = 0,
                    }));

            // ERP bağlantı testi: 10 istek / 1 dk / IP.
            // Uç, istekte verilen adrese dışarı bağlantı açar; sınırsız çağrı hem
            // müşteri ağına yönelik tarama hem de şifre deneme aracı olurdu.
            options.AddPolicy("erp-test-connection", httpContext =>
                RateLimitPartition.GetSlidingWindowLimiter(
                    httpContext.Connection.RemoteIpAddress?.ToString() ?? "unknown",
                    _ => new SlidingWindowRateLimiterOptions
                    {
                        PermitLimit       = 10,
                        Window            = TimeSpan.FromMinutes(1),
                        SegmentsPerWindow = 2,
                        QueueLimit        = 0,
                    }));

            // Anonim paylaşım görüntüleme: 60 istek / 1 dk / IP.
            // Kimlik doğrulaması yoktur; geçerli token'ı olan biri sunucuyu yormamalı.
            options.AddPolicy("share-public", httpContext =>
                RateLimitPartition.GetSlidingWindowLimiter(
                    httpContext.Connection.RemoteIpAddress?.ToString() ?? "unknown",
                    _ => new SlidingWindowRateLimiterOptions
                    {
                        PermitLimit       = 60,
                        Window            = TimeSpan.FromMinutes(1),
                        SegmentsPerWindow = 4,
                        QueueLimit        = 0,
                    }));

            // Contact form: 5 istek / 15 dk / IP
            options.AddPolicy("contact", httpContext =>
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
        // Dagitim ortamlari origin listesini "Cors:AllowedOrigins" bolumunden
        // (compose: Cors__AllowedOrigins__0) enjekte eder.
        var corsOrigins = ReadStringArray(configuration, "Cors:AllowedOrigins");

        if (corsOrigins.Length == 0 && !environment.IsDevelopment())
        {
            throw new InvalidOperationException(
                $"Cors:AllowedOrigins tanımlı değil. '{environment.EnvironmentName}' ortamında " +
                "izin verilen origin listesi zorunludur (örn. Cors__AllowedOrigins__0=https://app.example.com). " +
                "Açık uçlu CORS yalnızca Development ortamında kullanılabilir.");
        }

        services.AddCors(options => {
            options.AddDefaultPolicy(builder => {
                if (corsOrigins.Length > 0)
                    builder.WithOrigins(corsOrigins).AllowCredentials();
                else
                    // S5122: Yalnizca Development ortaminda calisan geri donus yolu;
                    // diger ortamlarda yukaridaki dogrulama uygulamayi baslatmaz.
#pragma warning disable S5122
                    builder.AllowAnyOrigin();
#pragma warning restore S5122

                builder.AllowAnyMethod().AllowAnyHeader();
            });
        });


        services.AddTransient<GlobalExceptionMiddleware>();

        // Override Infrastructure's AnonymousCurrentUserService with the JWT-aware implementation.
        services.AddHttpContextAccessor();
        services.AddScoped<ICurrentUserService, JwtCurrentUserService>();

        var metricsScrapeToken = ResolveMetricsScrapeToken(configuration);

        services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
            .AddScheme<MetricsScrapeOptions, MetricsScrapeAuthenticationHandler>(
                MetricsScrapeDefaults.AuthenticationScheme,
                options => options.Token = metricsScrapeToken)
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
                options.Events = new JwtBearerEvents
                {
                    OnChallenge = context =>
                    {
                        context.HandleResponse();
                        context.Response.StatusCode = StatusCodes.Status401Unauthorized;
                        context.Response.ContentType = "application/json";
                        var isExpired = context.AuthenticateFailure is SecurityTokenExpiredException;
                        var body = JsonSerializer.Serialize(new
                        {
                            isSuccess = false,
                            data = (object?)null,
                            error = isExpired
                                ? new { type = "Unauthorized", code = "AUTH_TOKEN_EXPIRED", description = "Oturum süresi doldu." }
                                : new { type = "Unauthorized", code = "AUTH_UNAUTHORIZED", description = "Yetkilendirme gereklidir." }
                        });
                        return context.Response.WriteAsync(body);
                    },
                    OnForbidden = context =>
                    {
                        context.Response.StatusCode = StatusCodes.Status403Forbidden;
                        context.Response.ContentType = "application/json";
                        var body = JsonSerializer.Serialize(new
                        {
                            isSuccess = false,
                            data = (object?)null,
                            error = new { type = "Forbidden", code = "AUTH_FORBIDDEN", description = "Bu işlem için yetkiniz yok." }
                        });
                        return context.Response.WriteAsync(body);
                    }
                };
            });

        services.AddAuthorization(options =>
        {
            options.AddPolicy("SuperAdmin", policy =>
                policy.RequireClaim("role", "SuperAdmin"));

            options.AddPolicy("CompanyAdmin", policy =>
                policy.RequireClaim("role", "SuperAdmin", "CompanyAdmin"));

            options.AddPolicy("CompanyWorker", policy =>
                policy.RequireClaim("role", "CompanyWorker"));

            options.AddPolicy("Individual", policy =>
                policy.RequireClaim("role", "Individual"));

            // SuperAdmin | CompanyAdmin | CompanyWorker | Individual
            options.AddPolicy("CompanyMember", policy =>
                policy.RequireClaim("role", "SuperAdmin", "CompanyAdmin", "CompanyWorker", "Individual"));

            // SEC-07 takibi: /metrics ve /health/detail'i SuperAdmin JWT'si korur, ancak
            // Prometheus 60 dakikalik bir access token'i yenileyemez. Bu politika ek olarak
            // uzun omurlu, yalnizca bu iki uca yetkili bir scrape token'ini kabul eder.
            options.AddPolicy(MetricsScrapeDefaults.PolicyName, policy =>
            {
                policy.AddAuthenticationSchemes(
                    JwtBearerDefaults.AuthenticationScheme,
                    MetricsScrapeDefaults.AuthenticationScheme);

                policy.RequireAssertion(context =>
                    context.User.HasClaim("role", "SuperAdmin") ||
                    context.User.HasClaim(
                        MetricsScrapeDefaults.ScopeClaimType,
                        MetricsScrapeDefaults.ReadScope));
            });
        });

        services.AddControllers().AddJsonOptions(options =>
        {
            options.JsonSerializerOptions.PropertyNamingPolicy = System.Text.Json.JsonNamingPolicy.CamelCase;
        });

        // Model binding hatalarını Result<T> contract'ına uygun döndür
        services.Configure<ApiBehaviorOptions>(options =>
        {
            options.InvalidModelStateResponseFactory = context =>
            {
                var errors = context.ModelState
                    .Where(e => e.Value?.Errors.Count > 0)
                    .SelectMany(e => e.Value!.Errors.Select(err => new
                    {
                        field   = e.Key,
                        message = string.IsNullOrWhiteSpace(err.ErrorMessage)
                            ? "Geçersiz değer."
                            : err.ErrorMessage
                    }))
                    .ToList();

                var response = new
                {
                    isSuccess = false,
                    data      = (object?)null,
                    error     = new
                    {
                        code             = "Validation.Failed",
                        description      = "Doğrulama hatası.",
                        validationErrors = errors
                    }
                };

                return new BadRequestObjectResult(response);
            };
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

            services.AddHangfireServer();
        }

        return services;
    }

    public static WebApplication UsePresentation(this WebApplication app, bool useInMemoryRepository = false)
    {
        ArgumentNullException.ThrowIfNull(app);

        // Ters proxy (nginx) arkasinda gercek istemci IP'si ve semasi; rate limiter
        // partition'lari dogru IP'yi gorebilmesi icin UseRateLimiter'dan once gelmeli.
        app.UseForwardedHeaders();
        app.UseMiddleware<SecurityHeadersMiddleware>();

        if (app.Environment.IsProduction())
            app.UseHsts();

        // Uygulama nginx arkasinda HTTP dinledigi icin varsayilan olarak kapali;
        // TLS'i dogrudan sonlandiran dagitimlarda yapilandirmadan acilabilir.
        if (app.Configuration.GetValue("Security:EnableHttpsRedirection", false))
            app.UseHttpsRedirection();

        app.UseRouting();
        app.UseCors();
        app.UseRateLimiter();
        app.UseMiddleware<GlobalExceptionMiddleware>();

        // Swagger varsayilan olarak yalnizca Development'ta acilir; digerleri opt-in.
        if (app.Configuration.GetValue("Swagger:Enabled", app.Environment.IsDevelopment()))
        {
            app.UseSwagger();
            app.UseSwaggerUI(options =>
            {
                options.SwaggerEndpoint("/swagger/v1/swagger.json", "CargoPilot API");
                options.RoutePrefix = "swagger";
                options.UseRequestInterceptor(
                    "(req) => { req.credentials = 'include'; return req; }");
            });
        }

        app.UseAuthentication();
        app.UseMiddleware<MustChangePasswordMiddleware>();
        app.UseHttpMetrics();
        app.UseAuthorization();

        if (!useInMemoryRepository)
        {
            app.UseHangfireDashboard("/hangfire", new DashboardOptions
            {
                Authorization = [new HangfireSuperAdminFilter()],
            });
        }

        app.MapControllers();

        // SEC-07: Prometheus ciktisi ve bilesen bazli saglik detayi ic bilgi sizdirir.
        app.MapMetrics("/metrics").RequireAuthorization(MetricsScrapeDefaults.PolicyName);

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
        }).RequireAuthorization(MetricsScrapeDefaults.PolicyName);

        return app;
    }

    /// <summary>
    /// <c>Metrics:ScrapeToken</c> degerini okur ve zayif/sablon token'lari reddeder.
    /// Anahtar tanimli degilse <see langword="null"/> doner ve scrape scheme'i devre disi kalir.
    /// </summary>
    /// <exception cref="InvalidOperationException">
    /// Token tanimli ancak minimum uzunluktan kisa veya bilinen bir sablon degerse.
    /// </exception>
    internal static string? ResolveMetricsScrapeToken(IConfiguration configuration)
    {
        var token = configuration["Metrics:ScrapeToken"];

        if (string.IsNullOrWhiteSpace(token))
        {
            return null;
        }

        token = token.Trim();

        if (token.Length < MetricsScrapeDefaults.MinimumTokenLength)
        {
            throw new InvalidOperationException(
                $"Metrics:ScrapeToken must be at least {MetricsScrapeDefaults.MinimumTokenLength} characters long.");
        }

        if (JwtSecretPolicy.LooksLikePlaceholder(token))
        {
            throw new InvalidOperationException(
                "Metrics:ScrapeToken uses a known default/placeholder value. Provide a real token via environment (Metrics__ScrapeToken).");
        }

        return token;
    }

    /// <summary>
    /// Bileşen bazında detaylı sağlık durumu JSON olarak döndürür.
    /// </summary>
    private static async Task WriteDetailedHealthResponse(
        HttpContext context,
        HealthReport report)
    {
        context.Response.ContentType = "application/json; charset=utf-8";

        // Exception mesajlari altyapi detayi (baglanti dizesi, host adi) sizdirabilir.
        var exposeErrors = context.RequestServices
            .GetRequiredService<IHostEnvironment>()
            .IsDevelopment();

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
                error       = exposeErrors ? e.Value.Exception?.Message : null
            })
        };

        await context.Response.WriteAsync(
            JsonSerializer.Serialize(result, _healthJsonOptions),
            context.RequestAborted);
    }

    /// <summary>
    /// X-Forwarded-* başlıklarını yalnızca güvenilen proxy'lerden kabul edecek şekilde yapılandırır.
    /// </summary>
    private static void AddForwardedHeaders(IServiceCollection services, IConfiguration configuration)
    {
        services.Configure<ForwardedHeadersOptions>(options =>
        {
            options.ForwardedHeaders = ForwardedHeaders.XForwardedFor | ForwardedHeaders.XForwardedProto;
            options.ForwardLimit     = configuration.GetValue("ForwardedHeaders:ForwardLimit", 1);

            // Varsayilan liste (loopback) temizlenir; guven sinirini yapilandirma belirler.
            options.KnownProxies.Clear();
            options.KnownNetworks.Clear();

            foreach (var proxy in ReadStringArray(configuration, "ForwardedHeaders:KnownProxies"))
            {
                if (IPAddress.TryParse(proxy, out var address))
                    options.KnownProxies.Add(address);
            }

            foreach (var network in ReadStringArray(configuration, "ForwardedHeaders:KnownNetworks"))
            {
                var parsed = ParseNetwork(network);
                if (parsed is not null)
                    options.KnownNetworks.Add(parsed);
            }

            if (options.KnownProxies.Count > 0 || options.KnownNetworks.Count > 0)
                return;

            // Yapilandirma yoksa guvenli varsayilan: loopback + ozel (Docker/LAN) araliklari.
            options.KnownProxies.Add(IPAddress.Loopback);
            options.KnownProxies.Add(IPAddress.IPv6Loopback);
            foreach (var network in GetDefaultTrustedNetworks())
                options.KnownNetworks.Add(network);
        });
    }

    // S1313: RFC1918 ozel ag araliklari sabittir; "ForwardedHeaders:KnownNetworks"
    // tanimlanmadiginda kullanilan guvenli varsayilan guven sinirini olustururlar.
#pragma warning disable S1313
    private static IEnumerable<IPNetwork> GetDefaultTrustedNetworks()
    {
        yield return new IPNetwork(IPAddress.Parse("127.0.0.0"), 8);
        yield return new IPNetwork(IPAddress.Parse("10.0.0.0"), 8);
        yield return new IPNetwork(IPAddress.Parse("172.16.0.0"), 12);
        yield return new IPNetwork(IPAddress.Parse("192.168.0.0"), 16);
    }
#pragma warning restore S1313

    /// <summary>"10.0.0.0/8" biçimindeki CIDR değerini ayrıştırır; geçersizse null döner.</summary>
    private static IPNetwork? ParseNetwork(string value)
    {
        var parts = value.Split('/', StringSplitOptions.TrimEntries | StringSplitOptions.RemoveEmptyEntries);
        if (parts.Length != 2 ||
            !IPAddress.TryParse(parts[0], out var prefix) ||
            !int.TryParse(parts[1], NumberStyles.Integer, CultureInfo.InvariantCulture, out var prefixLength))
        {
            return null;
        }

        return new IPNetwork(prefix, prefixLength);
    }

    private static string[] ReadStringArray(IConfiguration configuration, string key) =>
        configuration.GetSection(key).Get<string[]>()?
            .Where(value => !string.IsNullOrWhiteSpace(value))
            .Select(value => value.Trim())
            .ToArray() ?? [];
}
