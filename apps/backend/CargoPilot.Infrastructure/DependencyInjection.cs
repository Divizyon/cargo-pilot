using CargoPilot.Application.Abstractions;
using CargoPilot.Application.Common.Interfaces;
using CargoPilot.Application.Common.Settings;
using CargoPilot.Application.Features.Auth;
using CargoPilot.Infrastructure.Auth;
using CargoPilot.Infrastructure.Persistence;
using CargoPilot.Infrastructure.Persistence.Repositories;
using CargoPilot.Infrastructure.Persistence.Seeding;
using CargoPilot.Infrastructure.Security;
using CargoPilot.Infrastructure.Services;
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
        services.AddScoped<IItemRepository, ItemRepository>();
        services.AddScoped<IVehicleRepository, VehicleRepository>();
        services.AddScoped<IPasswordResetTokenRepository, PasswordResetTokenRepository>();
        services.AddScoped<IUserPasswordHistoryRepository, UserPasswordHistoryRepository>();
        services.AddHttpClient<IEmailService, ResendEmailService>(client =>
        {
            // BaseAddress constructor'da options üzerinden set ediliyor.
        });

        if (!useInMemoryRepository) {
            services.AddDbContext<AppDbContext>(options =>
                options.UseSqlServer(
                    configuration.GetConnectionString("DefaultConnection"),
                    sqlOptions => sqlOptions.EnableRetryOnFailure(
                        maxRetryCount: 5,
                        maxRetryDelay: TimeSpan.FromSeconds(30),
                        errorNumbersToAdd: null)));
            services.AddScoped<DbInitializer>();
            services.AddScoped<IAuthService, AuthService>();

            // OAuth token validator'ları — ClientId'ler gelince appsettings'e eklenir.
            services.AddScoped<IOAuthTokenValidator, GoogleTokenValidator>();
            services.AddScoped<IOAuthTokenValidator, MicrosoftTokenValidator>();
        }

        return services;
    }
}
