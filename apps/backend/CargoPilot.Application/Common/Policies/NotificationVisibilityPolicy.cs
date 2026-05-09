using CargoPilot.Domain.Enums;

namespace CargoPilot.Application.Common.Policies;

public static class NotificationVisibilityPolicy
{
    private static readonly IReadOnlySet<NotificationType> CompanyWorkerAllowedTypes =
        new HashSet<NotificationType>
        {
            NotificationType.ReportReady,
            NotificationType.ReportError,
        };

    /// <summary>
    /// Returns the set of visible notification types for the given role.
    /// null means no restriction — all types are visible.
    /// </summary>
    public static IReadOnlySet<NotificationType>? GetAllowedTypes(UserType userType) =>
        userType switch
        {
            UserType.SuperAdmin    => null,
            UserType.CompanyAdmin  => null,
            UserType.CompanyWorker => CompanyWorkerAllowedTypes,
            _                      => CompanyWorkerAllowedTypes,
        };

    public static bool IsTypeVisible(UserType userType, NotificationType notificationType) =>
        GetAllowedTypes(userType) is not { } allowed || allowed.Contains(notificationType);
}
