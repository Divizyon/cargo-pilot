using CargoPilot.Application.Common.Models;

namespace CargoPilot.Application.Common.Errors;

public static class AuthErrors
{
    public static readonly Error InvalidCredentials = new(
        ErrorType.Unauthorized,
        "AUTH_INVALID_CREDENTIALS",
        "Email veya şifre hatalı.");

    public static Error AccountLocked(int remainingSeconds) => new(
        ErrorType.Unauthorized,
        "AUTH_ACCOUNT_LOCKED",
        $"Hesabınız güvenlik nedeniyle geçici olarak kilitlenmiştir. {(int)Math.Ceiling(remainingSeconds / 60.0)} dakika sonra tekrar deneyiniz.",
        Metadata: new Dictionary<string, object> { ["lockoutRemainingSeconds"] = remainingSeconds });

    public static Error IpLocked(int remainingSeconds) => new(
        ErrorType.Unauthorized,
        "AUTH_IP_LOCKED",
        $"Bu IP adresinden çok fazla hatalı giriş denemesi yapıldı. {(int)Math.Ceiling(remainingSeconds / 60.0)} dakika sonra tekrar deneyiniz.",
        Metadata: new Dictionary<string, object> { ["lockoutRemainingSeconds"] = remainingSeconds });
}
