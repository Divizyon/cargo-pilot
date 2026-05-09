using Hangfire.Dashboard;

namespace CargoPilot.WebAPI.Hangfire;

internal sealed class HangfireSuperAdminFilter : IDashboardAuthorizationFilter
{
    public bool Authorize(DashboardContext context)
    {
        var httpContext = context.GetHttpContext();

        if (httpContext.User.Identity?.IsAuthenticated != true)
            return false;

        return httpContext.User.FindFirst("role")?.Value == "SuperAdmin";
    }
}
