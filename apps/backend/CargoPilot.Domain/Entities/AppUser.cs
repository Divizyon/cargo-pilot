using CargoPilot.Domain.Enums;

namespace CargoPilot.Domain.Entities;

/// <summary>Uygulama kullanıcısı.</summary>
public sealed class AppUser : BaseEntity {
    private const int _maxFailedAttempts = 5;
    private const int _lockoutDurationMinutes = 15;

    /// <summary>Kullanıcının bağlı olduğu şirket.</summary>
    public Guid? CompanyId { get; private set; }
    /// <summary>Ad.</summary>
    public string FirstName { get; private set; } = null!;
    /// <summary>Soyad.</summary>
    public string LastName { get; private set; } = null!;
    /// <summary>E-posta adresi.</summary>
    public string Email { get; private set; } = null!;
    /// <summary>Hashlenmiş parola. OAuth kullanıcılarında null olabilir.</summary>
    public string? PasswordHash { get; private set; }
    /// <summary>Kullanıcı tipi.</summary>
    public UserType UserType { get; private set; }
    /// <summary>Harici sistemdeki kullanıcı kimliği (OAuth).</summary>
    public string? ExternalSystemId { get; private set; }
    /// <summary>Kimlik doğrulama sağlayıcısı.</summary>
    public AuthProvider AuthProvider { get; private set; }
    /// <summary>Ardışık başarısız giriş denemesi sayısı.</summary>
    public int FailedLoginAttempts { get; private set; }
    /// <summary>Hesap kilidi bitiş zamanı (UTC).</summary>
    public DateTime? LockoutEndUtc { get; private set; }
    /// <summary>Kullanıcının ürün turunu tamamlayıp tamamlamadığı.</summary>
    public bool TourCompleted { get; private set; }
    public bool MustChangePassword { get; private set; }

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

    public void SetTourCompleted(bool value) => TourCompleted = value;

    public void SetMustChangePassword(bool value) => MustChangePassword = value;

    public void UpdateProfile(string firstName, string lastName) {
        FirstName = firstName.Trim();
        LastName = lastName.Trim();
    }

    public void UpdateEmail(string email) => Email = email.Trim().ToLowerInvariant();

    public void AssignToCompany(Guid companyId) => CompanyId = companyId;
}
