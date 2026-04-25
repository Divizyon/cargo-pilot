using CargoPilot.Application;
using CargoPilot.Infrastructure;
using CargoPilot.Infrastructure.Persistence.Seeding;
using CargoPilot.WebAPI;

var builder = WebApplication.CreateBuilder(args);

var useInMemory = builder.Configuration.GetValue<bool>("UseInMemoryDatabase");

builder.Services
    .AddApplication()
    .AddInfrastructure(builder.Configuration, useInMemoryRepository: useInMemory)
    .AddPresentation(builder.Configuration, useInMemoryRepository: useInMemory);

var app = builder.Build();

if (!useInMemory) {
    using var scope = app.Services.CreateScope();
    var dbInitializer = scope.ServiceProvider.GetRequiredService<DbInitializer>();
    await dbInitializer.InitializeAsync();
}

app.UsePresentation();

await app.RunAsync();
