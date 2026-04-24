using CargoPilot.Application.Features.Auth.Register;
using FluentValidation;
using Microsoft.Extensions.DependencyInjection;

namespace CargoPilot.Application;

public static class DependencyInjection
{
    public static IServiceCollection AddApplication(this IServiceCollection services)
    {
        services.AddValidatorsFromAssembly(typeof(DependencyInjection).Assembly);

        services.AddScoped<RegisterCommandHandler>();

        return services;
    }
}
