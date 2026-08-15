namespace CargoPilot.WebAPI.Middlewares;

public sealed class MustChangePasswordMiddleware
{
    private const string ForceChangePath = "/api/v1/auth/force-change-password";
    private readonly RequestDelegate _next;

    public MustChangePasswordMiddleware(RequestDelegate next) => _next = next;

    public async Task InvokeAsync(HttpContext context)
    {
        if (context.User.Identity?.IsAuthenticated == true)
        {
            var mustChange = context.User.FindFirst("mcp")?.Value == "true";
            if (mustChange &&
                !context.Request.Path.StartsWithSegments(ForceChangePath, StringComparison.OrdinalIgnoreCase))
            {
                context.Response.StatusCode = StatusCodes.Status403Forbidden;
                context.Response.ContentType = "application/json";
                await context.Response.WriteAsync(
                    """{"isSuccess":false,"data":null,"error":{"type":"Forbidden","code":"AUTH_MUST_CHANGE_PASSWORD","description":"İlk girişinizde şifrenizi değiştirmeniz zorunludur."}}""",
                    context.RequestAborted);
                return;
            }
        }

        await _next(context);
    }
}
