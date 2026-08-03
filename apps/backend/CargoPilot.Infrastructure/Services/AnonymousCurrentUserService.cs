using CargoPilot.Application.Abstractions;
using CargoPilot.Domain.Enums;

namespace CargoPilot.Infrastructure.Services;

// Auth implementasyonu geldiginde bu sinif JwtCurrentUserService ile swap edilir.
internal sealed class AnonymousCurrentUserService : ICurrentUserService {
    public Guid? UserId => null;
    public Guid? CompanyId => null;
    public UserType? UserType => null;
}
