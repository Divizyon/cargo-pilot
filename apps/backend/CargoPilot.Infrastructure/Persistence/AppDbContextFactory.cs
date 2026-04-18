using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Design;

namespace CargoPilot.Infrastructure.Persistence;

// Design-time factory: `dotnet ef` komutlarinin (migrations add / database update)
// runtime DI konteynirina ihtiyac duymadan DbContext olusturabilmesi icin gereklidir.
// Runtime tarafta kullanilmaz; sadece tasarim zamani (EF CLI) tarafindan cagirilir.
public sealed class AppDbContextFactory : IDesignTimeDbContextFactory<AppDbContext>
{
    public AppDbContext CreateDbContext(string[] args)
    {
        var connectionString = Environment.GetEnvironmentVariable("ConnectionStrings__DefaultConnection")
            ?? throw new InvalidOperationException(
                "ConnectionStrings__DefaultConnection env var tanımsız. " +
                "dotnet ef komutlarından önce bu değişkeni set et (örn. infra/env/.env.dev içindeki DATABASE_CONNECTION_STRING değeriyle, host'tan çalıştırırken 'mssql' yerine 'localhost' kullan).");

        var optionsBuilder = new DbContextOptionsBuilder<AppDbContext>();
        optionsBuilder.UseSqlServer(connectionString);

        return new AppDbContext(optionsBuilder.Options);
    }
}
