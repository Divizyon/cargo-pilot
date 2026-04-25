using CargoPilot.Application;
using CargoPilot.Infrastructure;
using CargoPilot.Infrastructure.Persistence;
using CargoPilot.WebAPI;
using Microsoft.EntityFrameworkCore;

var builder = WebApplication.CreateBuilder(args);

var useInMemory = builder.Environment.IsDevelopment();

builder.Services
    .AddApplication()
    .AddInfrastructure(builder.Configuration, useInMemoryRepository: useInMemory)
    .AddPresentation(useInMemoryRepository: useInMemory);

var app = builder.Build();

// Gerçek DB kullanıldığında migration'ları otomatik uygula
// Development'ta InMemory kullanıldığından migration gerekmez
if (!useInMemory)
{
    using var scope = app.Services.CreateScope();
    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    await db.Database.MigrateAsync();
}

app.UsePresentation();

await app.RunAsync();
