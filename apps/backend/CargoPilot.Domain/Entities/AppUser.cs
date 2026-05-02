using CargoPilot.Domain.Enums;

namespace CargoPilot.Domain.Entities;

public sealed class AppUser : BaseEntity {
    private const int _maxFailedAttempts = 5;
    private const int _lockoutDurationMinutes = 15;

    public Guid? CompanyId { get; private set; }
    public string FirstName { get; private set; } = null!;
    public string LastName { get; private set; } = null!;
    public string Email { get; private set; } = null!;
    public string? PasswordHash { get; private set; }
    public UserType UserType { get; private set; }
    public string? ExternalSystemId { get; private set; }
    public AuthProvider AuthProvider { get; private set; }
    public int FailedLoginAttempts { get; private set; }
    public DateTime? LockoutEndUtc { get; private set; }

    // EF Core sets navigation properties via materialization.
#pragma warning disable S1144
    public Company? Company { get; private set; }
#pragma warning restore S1144
    public ICollection<UserSession> UserSessions { get; } = [];
    public ICollection<UserLogin> UserLogins { get; } = [];

    private AppUser() { }

    public AppUser(
        Guid id,
        Guid? companyId,
        string firstName,
        string lastName,
        string email,
        string? passwordHash,
        UserType userType,
        string? externalSystemId,
        AuthProvider authProvider = AuthProvider.Local) : base(id) {
        CompanyId = companyId;
        FirstName = firstName;
        LastName = lastName;
        Email = email;
        PasswordHash = passwordHash;
        UserType = userType;
        ExternalSystemId = externalSystemId;
        AuthProvider = authProvider;
    }

    public bool IsLockedOut() =>
        LockoutEndUtc.HasValue && LockoutEndUtc.Value > DateTime.UtcNow;

    public void RecordFailedLogin() {
        FailedLoginAttempts++;
        if (FailedLoginAttempts >= _maxFailedAttempts)
            LockoutEndUtc = DateTime.UtcNow.AddMinutes(_lockoutDurationMinutes);
    }

    public void ResetLoginAttempts() {
        FailedLoginAttempts = 0;
        LockoutEndUtc = null;
    }

    public void SetPassword(string passwordHash) => PasswordHash = passwordHash;

    public void UpdateProfile(string firstName, string lastName) {
        FirstName = firstName.Trim();
        LastName = lastName.Trim();
    }
}
