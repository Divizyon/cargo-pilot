using System.Security.Claims;
using CargoPilot.Application.Abstractions;
using CargoPilot.Domain.Enums;

namespace CargoPilot.WebAPI.Services;

internal sealed class JwtCurrentUserService : ICurrentUserService
{
    private readonly IHttpContextAccessor _httpContextAccessor;

    public JwtCurrentUserService(IHttpContextAccessor httpContextAccessor)
    {
        _httpContextAccessor = httpContextAccessor;
    }

    public Guid? UserId
    {
        get
        {
            // JWT bearer is configured with MapInboundClaims = false, so "sub" is used as-is.
            var sub = _httpContextAccessor.HttpContext?.User.FindFirstValue("sub");
            return Guid.TryParse(sub, out var id) ? id : null;
        }
    }

    public Guid? CompanyId
    {
        get
        {
            var value = _httpContextAccessor.HttpContext?.User.FindFirstValue("company_id");
            return Guid.TryParse(value, out var id) ? id : null;
        }
    }

    public UserType? UserType
    {
        get
        {
            var value = _httpContextAccessor.HttpContext?.User.FindFirstValue("role");
            return Enum.TryParse<UserType>(value, out var userType) ? userType : null;
        }
    }
}
