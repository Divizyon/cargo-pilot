using CargoPilot.Application.Abstractions;
using CargoPilot.Application.Abstractions.Persistence;
using CargoPilot.Infrastructure.Persistence;
using CargoPilot.Infrastructure.Persistence.Repositories;
using CargoPilot.Infrastructure.Services;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;

namespace CargoPilot.Infrastructure;

public static class DependencyInjection {
    public static IServiceCollection AddInfrastructure(
        this IServiceCollection services,
        IConfiguration configuration,
        bool useInMemoryRepository = false) {
        services.AddScoped<ICurrentUserService, AnonymousCurrentUserService>();

        if (useInMemoryRepository) {
            services.AddSingleton<ICargoRepository, InMemoryCargoRepository>();
        }
        else {
            services.AddDbContext<AppDbContext>(options =>
                options.UseSqlServer(configuration.GetConnectionString("DefaultConnection")));

            services.AddScoped<ICargoRepository, CargoRepository>();
        }

        return services;
    }
}
