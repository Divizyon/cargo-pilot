using CargoPilot.Application;
using CargoPilot.Infrastructure;
using CargoPilot.Infrastructure.Persistence.Seeding;
using CargoPilot.WebAPI;
using Serilog;
using Serilog.Formatting.Compact;

var builder = WebApplication.CreateBuilder(args);

// Local secret override: appsettings.Development.Local.json gitignored'dır,
// gerçek SA parolası buraya yazılır (appsettings.Development.json'a değil).
builder.Configuration.AddJsonFile("appsettings.Development.Local.json", optional: true, reloadOnChange: true);

builder.Host.UseSerilog((context, configuration) =>
    configuration
        .ReadFrom.Configuration(context.Configuration)
        .Enrich.FromLogContext()
        .WriteTo.Console(new CompactJsonFormatter()));

var useInMemory = builder.Configuration.GetValue<bool>("UseInMemoryDatabase");

builder.Services
    .AddApplication()
    .AddInfrastructure(builder.Configuration, useInMemoryRepository: useInMemory)
    .AddPresentation(builder.Configuration, useInMemoryRepository: useInMemory);

var app = builder.Build();

// Gerçek DB kullanıldığında migration + seed çalıştır
if (!useInMemory) {
    using var scope = app.Services.CreateScope();
    var dbInitializer = scope.ServiceProvider.GetRequiredService<DbInitializer>();
    await dbInitializer.InitializeAsync();
}

app.UsePresentation();

await app.RunAsync();
