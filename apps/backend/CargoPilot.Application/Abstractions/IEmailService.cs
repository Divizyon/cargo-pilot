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

    Task SendPasswordChangedEmailAsync(
        string toEmail,
        string toName,
        CancellationToken cancellationToken = default);

    Task SendEmailChangeConfirmationEmailAsync(
        string toEmail,
        string toName,
        string confirmLink,
        CancellationToken cancellationToken = default);

    Task SendCompanyUserInvitationEmailAsync(
        string toEmail,
        string toName,
        string temporaryPassword,
        string loginUrl,
        CancellationToken cancellationToken = default);

    Task SendAccessRemovedEmailAsync(
        string toEmail,
        string toName,
        CancellationToken cancellationToken = default);

    Task SendContactNotificationEmailAsync(
        string senderName,
        string senderEmail,
        string subject,
        string message,
        CancellationToken cancellationToken = default);

    Task SendContactAutoReplyEmailAsync(
        string toEmail,
        string toName,
        CancellationToken cancellationToken = default);
}
