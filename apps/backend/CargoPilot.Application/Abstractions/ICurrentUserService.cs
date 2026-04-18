namespace CargoPilot.Application.Abstractions;

public interface ICurrentUserService {
    Guid? UserId { get; }
}
