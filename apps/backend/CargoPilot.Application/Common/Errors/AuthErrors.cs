using CargoPilot.Application.Common.Models;

namespace CargoPilot.Application.Common.Errors;

public static class AuthErrors
{
    public static readonly Error InvalidCredentials = new(
        ErrorType.Unauthorized,
        "AUTH_INVALID_CREDENTIALS",
        "Email veya şifre hatalı.");

    public static Error AccountLocked(int minutesRemaining) => new(
        ErrorType.Unauthorized,
        "AUTH_ACCOUNT_LOCKED",
        $"Hesabınız çok fazla hatalı giriş denemesi nedeniyle geçici olarak kilitlendi. Lütfen {minutesRemaining} dakika sonra tekrar deneyin.");

    public static readonly Error InvalidToken = new(
        ErrorType.Unauthorized,
        "AUTH_INVALID_TOKEN",
        "Refresh token geçersiz, süresi dolmuş veya iptal edilmiş.");

    public static readonly Error InvalidResetToken = new(
        ErrorType.Unauthorized,
        "AUTH_INVALID_RESET_TOKEN",
        "Şifre sıfırlama bağlantısı geçersiz veya süresi dolmuş.");

    public static readonly Error PasswordAlreadyUsed = new(
        ErrorType.BusinessRule,
        "AUTH_PASSWORD_ALREADY_USED",
        "Daha önce kullandığınız bir şifreyi kullanamazsınız.");
}
