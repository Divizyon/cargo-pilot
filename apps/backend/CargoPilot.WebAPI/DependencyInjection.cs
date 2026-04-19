using System.Reflection;
using CargoPilot.WebAPI.Middlewares;
using Microsoft.OpenApi;

namespace CargoPilot.WebAPI;

public static class DependencyInjection {
    public static IServiceCollection AddPresentation(this IServiceCollection services) {
        services.AddTransient<GlobalExceptionMiddleware>();

        services.AddControllers().AddJsonOptions(options =>
        {
            options.JsonSerializerOptions.PropertyNamingPolicy = null;
        });
        services.AddEndpointsApiExplorer();
        services.AddSwaggerGen(options =>
        {
            options.SwaggerDoc("v1", new OpenApiInfo
            {
                Title = "CargoPilot API",
                Version = "v1",
                Description = "CargoPilot uygulamasının REST API dokümantasyonu."
            });

            // XML yorum dosyasını Swagger'a dahil et
            var xmlFile = $"{Assembly.GetExecutingAssembly().GetName().Name}.xml";
            var xmlPath = Path.Combine(AppContext.BaseDirectory, xmlFile);
            if (File.Exists(xmlPath))
                options.IncludeXmlComments(xmlPath);

            // JWT Bearer auth iskelet tanımı (auth implemente edildiğinde devreye alınacak)
            options.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme
            {
                Name = "Authorization",
                Type = SecuritySchemeType.Http,
                Scheme = "Bearer",
                BearerFormat = "JWT",
                In = ParameterLocation.Header,
                Description = "JWT token girin. Örnek: Bearer {token}"
            });

            options.AddSecurityRequirement(_ => new OpenApiSecurityRequirement
            {
                {
                    new OpenApiSecuritySchemeReference("Bearer"),
                    new List<string>()
                }
            });
        });

        services.AddHealthChecks();

        return services;
    }

    public static WebApplication UsePresentation(this WebApplication app)
    {
        app.UseMiddleware<GlobalExceptionMiddleware>();

        // Production dışındaki tüm ortamlarda (Development, Staging) Swagger aktif
        if (!app.Environment.IsProduction())
        {
            app.UseSwagger();
            app.UseSwaggerUI(options =>
            {
                options.SwaggerEndpoint("/swagger/v1/swagger.json", "CargoPilot API");
                options.RoutePrefix = "swagger";
            });
        }

        app.UseAuthorization();
        app.MapControllers();
        app.MapHealthChecks("/health");

        return app;
    }
}
