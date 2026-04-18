using CargoPilot.Application.Features.Cargos.CreateCargo;
using FluentValidation;
using Microsoft.Extensions.DependencyInjection;

namespace CargoPilot.Application;

public static class DependencyInjection
{
    public static IServiceCollection AddApplication(this IServiceCollection services)
    {
        services.AddValidatorsFromAssembly(typeof(DependencyInjection).Assembly);

        services.AddScoped<CreateCargoUseCase>();

        return services;
    }
}
