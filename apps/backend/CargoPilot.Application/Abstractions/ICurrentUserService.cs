using CargoPilot.Domain.Enums;

namespace CargoPilot.Application.Abstractions;

public interface ICurrentUserService {
    Guid? UserId { get; }
    Guid? CompanyId { get; }
    UserType? UserType { get; }
}
