using CargoPilot.Domain.Enums;

namespace CargoPilot.Application.Common.Policies;

public static class NotificationVisibilityPolicy
{
    private static readonly IReadOnlyList<NotificationType> CompanyWorkerAllowed =
    [
        NotificationType.ReportReady,
        NotificationType.ReportError,
    ];

    /// <summary>
    /// Returns the allowed notification types for a given role,
    /// or null when there is no restriction (all types visible).
    /// </summary>
    public static IReadOnlyList<NotificationType>? GetAllowedTypes(UserType? userType) =>
        userType == UserType.CompanyWorker ? CompanyWorkerAllowed : null;
}
