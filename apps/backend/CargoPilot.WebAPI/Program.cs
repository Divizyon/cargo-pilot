using CargoPilot.Application;
using CargoPilot.Infrastructure;
using CargoPilot.Infrastructure.Jobs;
using CargoPilot.Infrastructure.Persistence.Seeding;
using CargoPilot.WebAPI;
using Hangfire;
using Serilog;
using Serilog.Formatting.Compact;

var builder = WebApplication.CreateBuilder(args);

// Local secret override: sadece Development ortamında yüklenir.
// Docker/CI gibi ortamlarda bu dosya yoktur veya yüklenmez.
if (builder.Environment.IsDevelopment())
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

app.UsePresentation(useInMemory);

if (!useInMemory)
{
    RecurringJob.AddOrUpdate<TrialExpiryNotificationJob>(
        "trial-expiry-notification",
        job => job.RunAsync(),
        Cron.Daily);

    RecurringJob.AddOrUpdate<NotificationCleanupJob>(
        "notification-cleanup",
        job => job.RunAsync(),
        Cron.Daily);

    // Vadesi gelen ERP entegrasyonlarini tarar; kullanicinin sectigi sync frekansini tuketen tek is budur.
    RecurringJob.AddOrUpdate<ErpScheduledSyncJob>(
        "erp-scheduled-sync",
        job => job.RunAsync(CancellationToken.None),
        ErpScheduledSyncJob.CronExpression);
}

await app.RunAsync();
