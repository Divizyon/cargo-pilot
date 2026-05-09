using CargoPilot.Domain.Enums;

namespace CargoPilot.Domain.Entities;

/// <summary>
/// Represents an application user in the system.
/// </summary>
public sealed class AppUser : BaseEntity {
    private const int _maxFailedAttempts = 5;
    private const int _lockoutDurationMinutes = 15;

    /// <summary>
    /// Gets the company identifier associated with the user.
    /// </summary>
    public Guid? CompanyId { get; private set; }
    /// <summary>
    /// Gets the user's first name.
    /// </summary>
    public string FirstName { get; private set; } = null!;
    /// <summary>
    /// Gets the user's last name.
    /// </summary>
    public string LastName { get; private set; } = null!;
    /// <summary>
    /// Gets the user's email address.
    /// </summary>
    public string Email { get; private set; } = null!;
    /// <summary>
    /// Gets the user's password hash for local authentication.
    /// </summary>
    public string? PasswordHash { get; private set; }
    /// <summary>
    /// Gets the user type.
    /// </summary>
    public UserType UserType { get; private set; }
    /// <summary>
    /// Gets the user identifier in an external system.
    /// </summary>
    public string? ExternalSystemId { get; private set; }
    /// <summary>
    /// Gets the authentication provider for the user.
    /// </summary>
    public AuthProvider AuthProvider { get; private set; }
    /// <summary>
    /// Gets the number of consecutive failed login attempts.
    /// </summary>
    public int FailedLoginAttempts { get; private set; }
    /// <summary>
    /// Gets the UTC date and time when the lockout ends.
    /// </summary>
    public DateTime? LockoutEndUtc { get; private set; }
    /// <summary>
    /// Gets a value indicating whether the user completed the onboarding tour.
    /// </summary>
    public bool TourCompleted { get; private set; }

    // EF Core sets navigation properties via materialization.
#pragma warning disable S1144
    /// <summary>
    /// Gets the company navigation property.
    /// </summary>
    public Company? Company { get; private set; }
#pragma warning restore S1144
    /// <summary>
    /// Gets the user sessions associated with this user.
    /// </summary>
    public ICollection<UserSession> UserSessions { get; } = [];
    /// <summary>
    /// Gets the external login records associated with this user.
    /// </summary>
    public ICollection<UserLogin> UserLogins { get; } = [];

    private AppUser() { }

    /// <summary>
    /// Initializes a new instance of the <see cref="AppUser"/> class.
    /// </summary>
    /// <param name="id">The unique identifier of the user.</param>
    /// <param name="companyId">The company identifier associated with the user.</param>
    /// <param name="firstName">The first name of the user.</param>
    /// <param name="lastName">The last name of the user.</param>
    /// <param name="email">The email address of the user.</param>
    /// <param name="passwordHash">The password hash for local authentication.</param>
    /// <param name="userType">The user type.</param>
    /// <param name="externalSystemId">The user identifier in an external system.</param>
    /// <param name="authProvider">The authentication provider.</param>
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

    /// <summary>
    /// Determines whether the user is currently locked out.
    /// </summary>
    /// <returns><c>true</c> if the user is locked out; otherwise, <c>false</c>.</returns>
    public bool IsLockedOut() =>
        LockoutEndUtc.HasValue && LockoutEndUtc.Value > DateTime.UtcNow;

    /// <summary>
    /// Records a failed login attempt and applies lockout when threshold is reached.
    /// </summary>
    public void RecordFailedLogin() {
        FailedLoginAttempts++;
        if (FailedLoginAttempts >= _maxFailedAttempts)
            LockoutEndUtc = DateTime.UtcNow.AddMinutes(_lockoutDurationMinutes);
    }

    /// <summary>
    /// Resets failed login attempts and clears lockout state.
    /// </summary>
    public void ResetLoginAttempts() {
        FailedLoginAttempts = 0;
        LockoutEndUtc = null;
    }

    /// <summary>
    /// Sets the password hash for local authentication.
    /// </summary>
    /// <param name="passwordHash">The password hash value.</param>
    public void SetPassword(string passwordHash) => PasswordHash = passwordHash;

    /// <summary>
    /// Sets the onboarding tour completion value.
    /// </summary>
    /// <param name="value">The completion state to apply.</param>
    public void SetTourCompleted(bool value) => TourCompleted = value;

    /// <summary>
    /// Updates the first and last name values.
    /// </summary>
    /// <param name="firstName">The first name to set.</param>
    /// <param name="lastName">The last name to set.</param>
    public void UpdateProfile(string firstName, string lastName) {
        FirstName = firstName.Trim();
        LastName = lastName.Trim();
    }

    /// <summary>
    /// Assigns the user to a company.
    /// </summary>
    /// <param name="companyId">The company identifier.</param>
    public void AssignToCompany(Guid companyId) => CompanyId = companyId;
}
