namespace CargoPilot.Application.Abstractions;

public interface IEmailService {
    Task SendPasswordResetEmailAsync(
        string toEmail,
        string toName,
        string resetLink,
        CancellationToken cancellationToken = default);

    Task SendNewDeviceWarningEmailAsync(
        string toEmail,
        string deviceSummary,
        DateTime loginTime,
        string secureAccountLink,
        CancellationToken cancellationToken = default);

    Task SendCompanyUserInvitationEmailAsync(
        string toEmail,
        string toName,
        string temporaryPassword,
        string loginUrl,
        CancellationToken cancellationToken = default);
}
