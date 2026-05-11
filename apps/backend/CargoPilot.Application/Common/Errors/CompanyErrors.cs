using CargoPilot.Application.Common.Models;

namespace CargoPilot.Application.Common.Errors;

public static class CompanyErrors
{
    public static readonly Error UserLimitReached = new(
        ErrorType.BusinessRule,
        "COMPANY_USER_LIMIT_REACHED",
        "Plan limitinize ulaştınız. Planınızı yükseltin.");

    public static readonly Error UserNotFound = new(
        ErrorType.NotFound,
        "COMPANY_USER_NOT_FOUND",
        "Kullanıcı bulunamadı.");

    public static readonly Error EmailAlreadyExists = new(
        ErrorType.Conflict,
        "COMPANY_USER_EMAIL_EXISTS",
        "Bu e-posta adresi zaten kullanılmaktadır.");

    public static readonly Error CompanyNotFound = new(
        ErrorType.NotFound,
        "COMPANY_NOT_FOUND",
        "Şirket bulunamadı.");
}
