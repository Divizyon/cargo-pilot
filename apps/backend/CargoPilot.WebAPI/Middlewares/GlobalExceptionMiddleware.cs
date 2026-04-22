using CargoPilot.Application.Common.Models;

namespace CargoPilot.WebAPI.Middlewares;

public partial class GlobalExceptionMiddleware : IMiddleware
{
    private readonly ILogger<GlobalExceptionMiddleware> _logger;

    public GlobalExceptionMiddleware(ILogger<GlobalExceptionMiddleware> logger)
    {
        _logger = logger;
    }

    [LoggerMessage(Level = LogLevel.Error, Message = "Beklenmeyen hata. TraceId: {TraceId}")]
    private partial void LogUnhandledException(string traceId, Exception ex);

    public async Task InvokeAsync(HttpContext context, RequestDelegate next)
    {
        try
        {
            await next(context);
        }
        catch (Exception ex)
        {
            LogUnhandledException(context.TraceIdentifier, ex);
            await HandleExceptionAsync(context);
        }
    }

    private static async Task HandleExceptionAsync(HttpContext context)
    {
        context.Response.ContentType = "application/json";
        context.Response.StatusCode = StatusCodes.Status500InternalServerError;

        var response = new ExceptionResponse(
            IsSuccess: false,
            Data: null,
            Error: new Error(ErrorType.Unexpected, "ServerError.Unhandled", "Sunucuda beklenmeyen bir hata meydana geldi."),
            TraceId: context.TraceIdentifier);

        await context.Response.WriteAsJsonAsync(response);
    }

    private sealed record ExceptionResponse(bool IsSuccess, object? Data, Error Error, string TraceId);
}
