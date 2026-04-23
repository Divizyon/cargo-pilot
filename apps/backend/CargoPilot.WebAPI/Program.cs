using CargoPilot.Application;
using CargoPilot.Infrastructure;
using CargoPilot.WebAPI;

var builder = WebApplication.CreateBuilder(args);

var useInMemory = builder.Environment.IsDevelopment();

builder.Services
    .AddApplication()
    .AddInfrastructure(builder.Configuration, useInMemoryRepository: useInMemory)
    .AddPresentation(useInMemoryRepository: useInMemory);

var app = builder.Build();

app.UsePresentation();

await app.RunAsync();
