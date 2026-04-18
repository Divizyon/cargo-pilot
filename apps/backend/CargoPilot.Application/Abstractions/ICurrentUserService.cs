namespace CargoPilot.Application.Abstractions;

/// <summary>
/// Sistemde işlem yapan kullanıcının kimlik (Identity) bilgisini sağlayan servis sözleşmesi.
/// </summary>
public interface ICurrentUserService {
    /// <summary>
    /// Mevcut kullanıcının (eğer login ise) benzersiz kimliği.
    /// </summary>
    Guid? UserId { get; }
}
