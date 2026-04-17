using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Design;

namespace CargoPilot.Infrastructure.Persistence;

// Design-time factory: `dotnet ef` komutlarinin (migrations add / database update)
// runtime DI konteynirina ihtiyac duymadan DbContext olusturabilmesi icin gereklidir.
// Runtime tarafta kullanilmaz; sadece tasarim zamani (EF CLI) tarafindan cagirilir.
public sealed class AppDbContextFactory : IDesignTimeDbContextFactory<AppDbContext>
{
    private const string FallbackConnectionString =
        "Server=localhost;Database=CargoPilotDev;Trusted_Connection=True;TrustServerCertificate=True;";

    public AppDbContext CreateDbContext(string[] args)
    {
        var connectionString = Environment.GetEnvironmentVariable("ConnectionStrings__DefaultConnection")
            ?? FallbackConnectionString;

        var optionsBuilder = new DbContextOptionsBuilder<AppDbContext>();
        optionsBuilder.UseSqlServer(connectionString);

        return new AppDbContext(optionsBuilder.Options);
    }
}
