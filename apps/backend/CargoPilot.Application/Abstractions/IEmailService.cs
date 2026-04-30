namespace CargoPilot.Application.Abstractions;

public interface IEmailService {
    Task SendPasswordResetEmailAsync(
        string toEmail,
        string toName,
        string resetLink,
        CancellationToken cancellationToken = default);
}
