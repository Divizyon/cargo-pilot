namespace CargoPilot.WebAPI.Controllers;

/// <summary>Kullanıcının UI düzeyindeki erişim izinleri.</summary>
public sealed record UserPermissionsResponse(
    bool CanSeeDashboard,
    bool CanShareReport);
