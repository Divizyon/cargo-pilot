using CargoPilot.Application.Abstractions;
using CargoPilot.Application.Common.Interfaces;
using CargoPilot.Application.Common.Settings;
using CargoPilot.Application.Features.Auth;
using CargoPilot.Infrastructure.Auth;
using CargoPilot.Infrastructure.Jobs;
using CargoPilot.Infrastructure.Persistence;
using CargoPilot.Infrastructure.Persistence.Repositories;
using CargoPilot.Infrastructure.Persistence.Seeding;
using CargoPilot.Infrastructure.Security;
using CargoPilot.Infrastructure.Services;
using CargoPilot.Infrastructure.Services.ErpConnectors;
using Hangfire;
using Hangfire.SqlServer;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;

namespace CargoPilot.Infrastructure;

public static class DependencyInjection {
    public static IServiceCollection AddInfrastructure(
        this IServiceCollection services,
        IConfiguration configuration,
        bool useInMemoryRepository = false) {
        services.AddOptions<JwtSettings>()
            .Bind(configuration.GetSection("Jwt"))
            .Validate(s => !string.IsNullOrWhiteSpace(s.Secret), "Jwt:Secret is required.")
            .Validate(s => !string.IsNullOrWhiteSpace(s.Issuer), "Jwt:Issuer is required.")
            .Validate(s => !string.IsNullOrWhiteSpace(s.Audience), "Jwt:Audience is required.")
            .ValidateOnStart();

        services.AddOptions<ResendSettings>()
            .Bind(configuration.GetSection("Resend"))
            .Validate(s => !string.IsNullOrWhiteSpace(s.BaseUrl), "Resend:BaseUrl is required.")
            .Validate(s => !string.IsNullOrWhiteSpace(s.ApiKey), "Resend:ApiKey is required.")
            .Validate(s => !string.IsNullOrWhiteSpace(s.FromEmail), "Resend:FromEmail is required.")
            .ValidateOnStart();

        services.AddOptions<EmailChangeSettings>()
            .Bind(configuration.GetSection("EmailChange"))
            .Validate(s => !string.IsNullOrWhiteSpace(s.FrontendConfirmUrl), "EmailChange:FrontendConfirmUrl is required.")
            .Validate(s => s.TokenExpiryMinutes > 0, "EmailChange:TokenExpiryMinutes must be greater than 0.")
            .ValidateOnStart();

        services.AddSingleton(sp =>
            sp.GetRequiredService<Microsoft.Extensions.Options.IOptions<EmailChangeSettings>>().Value);

        services.AddOptions<PasswordResetSettings>()
            .Bind(configuration.GetSection("PasswordReset"))
            .PostConfigure(settings =>
            {
                // Temporary backward compatibility: some deployments still provide
                // Resend:PasswordResetFrontendUrl instead of PasswordReset:FrontendResetUrl.
                if (string.IsNullOrWhiteSpace(settings.FrontendResetUrl))
                {
                    settings.FrontendResetUrl = configuration["Resend:PasswordResetFrontendUrl"] ?? string.Empty;
                }
            })
            .Validate(s => !string.IsNullOrWhiteSpace(s.FrontendResetUrl), "PasswordReset:FrontendResetUrl is required.")
            .Validate(s => s.TokenExpiryMinutes > 0, "PasswordReset:TokenExpiryMinutes must be greater than 0.")
            .ValidateOnStart();

        services.AddScoped<ICurrentUserService, AnonymousCurrentUserService>();
        services.AddScoped<IPasswordHasher, BCryptPasswordHasher>();
        services.AddScoped<IJwtTokenService, JwtTokenService>();
        services.AddScoped<IUserRepository, UserRepository>();
        services.AddScoped<ICompanyRepository, CompanyRepository>();
        services.AddScoped<IItemRepository, ItemRepository>();
        services.AddScoped<IVehicleRepository, VehicleRepository>();
        services.AddScoped<IUserVehicleFavoriteRepository, UserVehicleFavoriteRepository>();
        services.AddScoped<ILoadingPlanRepository, LoadingPlanRepository>();
        services.AddScoped<IOptimizationEngine, OptimizationEngine>();
        services.AddScoped<IErpConstraintMappingService, ErpConstraintMappingService>();
        services.AddScoped<IIntegrationRepository, IntegrationRepository>();
        services.AddScoped<IPasswordResetTokenRepository, PasswordResetTokenRepository>();
        services.AddScoped<IUserPasswordHistoryRepository, UserPasswordHistoryRepository>();
        services.AddScoped<IErpExportService, ErpExportService>();
        services.AddScoped<INotificationRepository, NotificationRepository>();
        services.AddScoped<IUserSessionRepository, UserSessionRepository>();       
        services.AddScoped<IEmailChangeTokenRepository, EmailChangeTokenRepository>();
        services.AddScoped<IPendingItemMappingRepository, PendingItemMappingRepository>();
        services.AddScoped<IErpProductFetcher, MockErpProductFetcher>();
        services.AddDataProtection();
        services.AddScoped<IErpPasswordProtector, DataProtectionErpPasswordProtector>();
        services.AddScoped<IErpSettingsRepository, ErpSettingsRepository>();
        services.AddTransient<IErpConnector, LogoErpConnector>();
        services.AddTransient<IErpConnector, NetsisErpConnector>();
        services.AddHttpClient<IEmailService, ResendEmailService>(client =>
        {
            // BaseAddress constructor'da options üzerinden set ediliyor.
        });

        services.AddTransient<TrialExpiryNotificationJob>();
        services.AddTransient<NotificationCleanupJob>();

        if (!useInMemoryRepository) {
            var connectionString = configuration.GetConnectionString("DefaultConnection");

            services.AddDbContext<AppDbContext>(options =>
                options.UseSqlServer(
                    connectionString,
                    sqlOptions => sqlOptions.EnableRetryOnFailure(
                        maxRetryCount: 5,
                        maxRetryDelay: TimeSpan.FromSeconds(30),
                        errorNumbersToAdd: null)));
            services.AddScoped<DbInitializer>();
            services.AddScoped<IAuthService, AuthService>();
            services.AddScoped<IOAuthTokenValidator, GoogleTokenValidator>();
            services.AddHttpClient<IGoogleOAuthService, GoogleOAuthService>();

            services.AddHangfire(config => config
                .SetDataCompatibilityLevel(CompatibilityLevel.Version_180)
                .UseSimpleAssemblyNameTypeSerializer()
                .UseRecommendedSerializerSettings()
                .UseSqlServerStorage(connectionString, new SqlServerStorageOptions {
                    CommandBatchMaxTimeout = TimeSpan.FromMinutes(5),
                    SlidingInvisibilityTimeout = TimeSpan.FromMinutes(5),
                    QueuePollInterval = TimeSpan.Zero,
                    UseRecommendedIsolationLevel = true,
                    DisableGlobalLocks = true
                }));

            services.AddTransient<ErpExportJob>();
            services.AddScoped<IErpExportJobScheduler, HangfireErpExportJobScheduler>();
        } else {
            services.AddScoped<IErpExportJobScheduler, NoOpErpExportJobScheduler>();
        }

        return services;
    }
}
