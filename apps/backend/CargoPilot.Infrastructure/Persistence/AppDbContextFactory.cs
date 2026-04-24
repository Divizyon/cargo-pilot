using CargoPilot.Infrastructure.Services;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Design;
using Microsoft.Extensions.Configuration;

namespace CargoPilot.Infrastructure.Persistence;

// Design-time factory: `dotnet ef` komutlarinin (migrations add / database update)
// runtime DI konteynirina ihtiyac duymadan DbContext olusturabilmesi icin gereklidir.
// Runtime tarafta kullanilmaz; sadece tasarim zamani (EF CLI) tarafindan cagirilir.
public sealed class AppDbContextFactory : IDesignTimeDbContextFactory<AppDbContext> {
    public AppDbContext CreateDbContext(string[] args) {
        var connectionString = Environment.GetEnvironmentVariable("ConnectionStrings__DefaultConnection")
            ?? LoadDevelopmentConnectionString();

        if (string.IsNullOrWhiteSpace(connectionString)) {
            throw new InvalidOperationException(
                "Bağlantı dizesi bulunamadı. Önce ConnectionStrings__DefaultConnection env var'ını set et " +
                "veya apps/backend/CargoPilot.WebAPI/appsettings.Development.json içinde " +
                "ConnectionStrings:DefaultConnection tanımla.");
        }

        var optionsBuilder = new DbContextOptionsBuilder<AppDbContext>();
        optionsBuilder.UseSqlServer(connectionString);

        return new AppDbContext(optionsBuilder.Options, new AnonymousCurrentUserService());
    }

    private static string? LoadDevelopmentConnectionString() {
        var webApiBasePath = ResolveWebApiBasePath();
        if (webApiBasePath is null) {
            return null;
        }

        var configuration = new ConfigurationBuilder()
            .SetBasePath(webApiBasePath)
            .AddJsonFile("appsettings.Development.json", optional: true, reloadOnChange: false)
            .Build();

        return configuration.GetConnectionString("DefaultConnection");
    }

    private static string? ResolveWebApiBasePath() {
        var currentDirectory = Directory.GetCurrentDirectory();
        var candidates = new[] {
            Path.Combine(currentDirectory, "apps", "backend", "CargoPilot.WebAPI"),
            Path.Combine(currentDirectory, "CargoPilot.WebAPI"),
            Path.Combine(currentDirectory, "..", "CargoPilot.WebAPI"),
            Path.Combine(currentDirectory, "..", "..", "apps", "backend", "CargoPilot.WebAPI")
        };

        foreach (var candidate in candidates) {
            var fullPath = Path.GetFullPath(candidate);
            if (Directory.Exists(fullPath)) {
                return fullPath;
            }
        }

        return null;
    }
}
