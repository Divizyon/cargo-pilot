namespace CargoPilot.WebAPI.Middlewares;

/// <summary>
/// Tüm yanıtlara temel güvenlik başlıklarını ekler.
/// API yanıtları tarayıcıda doküman olarak render edilmediği için kapalı bir CSP uygulanır;
/// HTML arayüz sunan yollar (Swagger, Hangfire) CSP dışında bırakılır.
/// </summary>
public sealed class SecurityHeadersMiddleware
{
    private const string ApiContentSecurityPolicy =
        "default-src 'none'; frame-ancestors 'none'; base-uri 'none'; form-action 'none'";

    private const string MinimalPermissionsPolicy =
        "accelerometer=(), camera=(), geolocation=(), gyroscope=(), magnetometer=(), microphone=(), payment=(), usb=()";

    private static readonly string[] _htmlUiPaths = ["/swagger", "/hangfire"];

    private readonly RequestDelegate _next;

    public SecurityHeadersMiddleware(RequestDelegate next) => _next = next;

    public Task InvokeAsync(HttpContext context)
    {
        ArgumentNullException.ThrowIfNull(context);

        var headers = context.Response.Headers;
        headers["X-Content-Type-Options"] = "nosniff";
        headers["X-Frame-Options"]        = "DENY";
        headers["Referrer-Policy"]        = "no-referrer";
        headers["Permissions-Policy"]     = MinimalPermissionsPolicy;

        if (!IsHtmlUiPath(context.Request.Path))
            headers["Content-Security-Policy"] = ApiContentSecurityPolicy;

        return _next(context);
    }

    private static bool IsHtmlUiPath(PathString path) =>
        _htmlUiPaths.Any(prefix => path.StartsWithSegments(prefix, StringComparison.OrdinalIgnoreCase));
}
