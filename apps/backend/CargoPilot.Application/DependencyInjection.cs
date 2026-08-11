using CargoPilot.Application.Abstractions;
using CargoPilot.Application.Common.Behaviors;
using CargoPilot.Application.Common.Interfaces;
using CargoPilot.Application.Common.Optimization;
using CargoPilot.Application.Services;
using FluentValidation;
using MediatR;
using Microsoft.Extensions.DependencyInjection;

namespace CargoPilot.Application;

public static class DependencyInjection
{
    public static IServiceCollection AddApplication(this IServiceCollection services)
    {
        services.AddMediatR(cfg =>
            cfg.RegisterServicesFromAssembly(typeof(DependencyInjection).Assembly));

        services.AddValidatorsFromAssembly(typeof(DependencyInjection).Assembly);

        services.AddTransient(typeof(IPipelineBehavior<,>), typeof(ValidationBehavior<,>));

        services.AddScoped<INotificationService, NotificationService>();
        services.AddScoped<IOptimizationEngine, OptimizationEngine>();

        return services;
    }
}
