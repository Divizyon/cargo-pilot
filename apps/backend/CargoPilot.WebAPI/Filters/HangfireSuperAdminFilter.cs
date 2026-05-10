using Hangfire.Dashboard;

namespace CargoPilot.WebAPI.Filters;

public sealed class HangfireSuperAdminFilter : IDashboardAuthorizationFilter
{
    public bool Authorize(DashboardContext context)
    {
        var httpContext = context.GetHttpContext();
        return httpContext.User.Identity?.IsAuthenticated == true &&
               httpContext.User.Claims.Any(c => c.Type == "role" && c.Value == "SuperAdmin");
    }
}
