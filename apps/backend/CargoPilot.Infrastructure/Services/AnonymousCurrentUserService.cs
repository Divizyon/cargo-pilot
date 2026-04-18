using CargoPilot.Application.Abstractions;

namespace CargoPilot.Infrastructure.Services;

// Auth implementasyonu geldiginde bu sinif JwtCurrentUserService ile swap edilir.
internal sealed class AnonymousCurrentUserService : ICurrentUserService
{
    public Guid? UserId => null;
}
