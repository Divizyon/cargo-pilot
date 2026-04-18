using CargoPilot.Application;
using CargoPilot.Infrastructure;
using CargoPilot.WebAPI;

var builder = WebApplication.CreateBuilder(args);

builder.Services
    .AddApplication()
    .AddInfrastructure(builder.Configuration, useInMemoryRepository: builder.Environment.IsDevelopment())
    .AddPresentation();

var app = builder.Build();

app.UsePresentation();

await app.RunAsync();
