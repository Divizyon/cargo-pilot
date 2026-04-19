using CargoPilot.Application.Common.Models;

namespace CargoPilot.WebAPI.Middlewares;

public partial class GlobalExceptionMiddleware : IMiddleware
{
    private readonly ILogger<GlobalExceptionMiddleware> _logger;

    public GlobalExceptionMiddleware(ILogger<GlobalExceptionMiddleware> logger)
    {
        _logger = logger;
    }

    [LoggerMessage(Level = LogLevel.Error, Message = "Uygulama genelinde beklenmeyen bir hata oluştu.")]
    private partial void LogUnhandledException(Exception ex);

    public async Task InvokeAsync(HttpContext context, RequestDelegate next)
    {
        try
        {
            await next(context);
        }
        catch (Exception ex)
        {
            LogUnhandledException(ex);
            await HandleExceptionAsync(context);
        }
    }

    private static async Task HandleExceptionAsync(HttpContext context)
    {
        context.Response.ContentType = "application/json";
        context.Response.StatusCode = StatusCodes.Status500InternalServerError;

        var response = Result<object>.Failure(
            new Error("ServerError.Unhandled", "Sunucuda beklenmeyen bir hata meydana geldi."));

        await context.Response.WriteAsJsonAsync(response);
    }
}
