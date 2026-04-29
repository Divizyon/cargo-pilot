using CargoPilot.Application.Abstractions;
using CargoPilot.Application.Common.Settings;
using MailKit.Net.Smtp;
using MailKit.Security;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using MimeKit;

namespace CargoPilot.Infrastructure.Services;

internal sealed class SmtpEmailService : IEmailService
{
    private static readonly Action<ILogger, string, Exception> _logSmtpFailure =
        LoggerMessage.Define<string>(
            LogLevel.Warning,
            new EventId(2, "SmtpSendFailed"),
            "SMTP gönderimi başarısız. Alıcı={ToEmail}");

    private readonly EmailSettings _settings;
    private readonly ILogger<SmtpEmailService> _logger;

    public SmtpEmailService(IOptions<EmailSettings> settings, ILogger<SmtpEmailService> logger)
    {
        _settings = settings.Value;
        _logger = logger;
    }

    public async Task SendPasswordResetEmailAsync(
        string toEmail,
        string toName,
        string resetLink,
        CancellationToken cancellationToken = default)
    {
        var message = new MimeMessage();
        message.From.Add(new MailboxAddress(_settings.FromName, _settings.FromAddress));
        message.To.Add(new MailboxAddress(toName, toEmail));
        message.Subject = "Cargo Pilot — Şifre Sıfırlama";

        var bodyBuilder = new BodyBuilder
        {
            HtmlBody = $"""
                <p>Merhaba {toName},</p>
                <p>Şifrenizi sıfırlamak için aşağıdaki bağlantıya tıklayın.
                Bu bağlantı <strong>10 dakika</strong> geçerlidir.</p>
                <p><a href="{resetLink}">Şifremi Sıfırla</a></p>
                <p>Bu isteği siz yapmadıysanız bu e-postayı görmezden gelebilirsiniz.</p>
                <p>— Cargo Pilot Ekibi</p>
                """,
            TextBody = $"Şifrenizi sıfırlamak için bu bağlantıyı kullanın (10 dakika geçerli): {resetLink}"
        };

        message.Body = bodyBuilder.ToMessageBody();

        try
        {
            using var client = new SmtpClient();
            await client.ConnectAsync(_settings.SmtpHost, _settings.SmtpPort, SecureSocketOptions.StartTls, cancellationToken);
            await client.AuthenticateAsync(_settings.SmtpUser, _settings.SmtpPassword, cancellationToken);
            await client.SendAsync(message, cancellationToken);
            await client.DisconnectAsync(quit: true, cancellationToken);
        }
        catch (Exception ex)
        {
            // SMTP yapılandırılmamışsa veya ulaşılamazsa loglayıp devam et.
            // Reset linki zaten uygulama loğuna yazılmıştır (AuthService).
            _logSmtpFailure(_logger, toEmail, ex);
        }
    }
}
