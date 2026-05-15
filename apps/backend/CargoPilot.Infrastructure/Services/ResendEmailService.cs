using System.Globalization;
using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json.Serialization;
using CargoPilot.Application.Abstractions;
using CargoPilot.Application.Common.Settings;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace CargoPilot.Infrastructure.Services;

internal sealed class ResendEmailService : IEmailService
{
    private static readonly Action<ILogger, int, string, Exception?> LogResendSendFailure =
        LoggerMessage.Define<int, string>(
            LogLevel.Error,
            new EventId(1001, nameof(LogResendSendFailure)),
            "Resend mail gonderimi basarisiz. StatusCode={StatusCode}, Response={ResponseBody}");

    private readonly HttpClient _httpClient;
    private readonly ResendSettings _settings;
    private readonly ILogger<ResendEmailService> _logger;

    public ResendEmailService(
        HttpClient httpClient,
        IOptions<ResendSettings> settings,
        ILogger<ResendEmailService> logger)
    {
        _httpClient = httpClient;
        _settings = settings.Value;
        _logger = logger;

        _httpClient.BaseAddress ??= new Uri(_settings.BaseUrl);
        _httpClient.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", _settings.ApiKey);
    }

    public async Task SendPasswordResetEmailAsync(
        string toEmail,
        string toName,
        string resetLink,
        CancellationToken cancellationToken = default)
    {
        var request = new ResendSendEmailRequest
        {
            From = string.IsNullOrWhiteSpace(_settings.FromName)
                ? _settings.FromEmail
                : $"{_settings.FromName} <{_settings.FromEmail}>",
            To = [toEmail],
            Subject = "Cargo Pilot — Şifre Sıfırlama",
            Html = $"""
                <p>Merhaba {toName},</p>
                <p>Şifrenizi sıfırlamak için aşağıdaki bağlantıya tıklayın.
                Bu bağlantı <strong>10 dakika</strong> geçerlidir.</p>
                <p><a href="{resetLink}">Şifremi Sıfırla</a></p>
                <p>Bu isteği siz yapmadıysanız bu e-postayı görmezden gelebilirsiniz.</p>
                <p>— Cargo Pilot Ekibi</p>
                """,
            Text = $"Şifrenizi sıfırlamak için bu bağlantıyı kullanın (10 dakika geçerli): {resetLink}"
        };

        using var response = await _httpClient.PostAsJsonAsync("/emails", request, cancellationToken);
        if (!response.IsSuccessStatusCode)
        {
            var responseBody = await response.Content.ReadAsStringAsync(cancellationToken);
            LogResendSendFailure(_logger, (int)response.StatusCode, responseBody, null);
            response.EnsureSuccessStatusCode();
        }
    }

    public async Task SendNewDeviceWarningEmailAsync(
        string toEmail,
        string deviceSummary,
        DateTime loginTime,
        string secureAccountLink,
        CancellationToken cancellationToken = default)
    {
        var formattedTime = loginTime.ToString("dd.MM.yyyy HH:mm", CultureInfo.InvariantCulture) + " UTC";

        var encodedDeviceSummary = WebUtility.HtmlEncode(deviceSummary);

        var request = new ResendSendEmailRequest
        {
            From = string.IsNullOrWhiteSpace(_settings.FromName)
                ? _settings.FromEmail
                : $"{_settings.FromName} <{_settings.FromEmail}>",
            To = [toEmail],
            Subject = "Cargo Pilot — Hesabınıza Yeni Bir Cihazdan Giriş Yapıldı",
            Html = $"""
                <div style="font-family:sans-serif;max-width:600px;margin:0 auto;color:#1a1a1a;">
                  <h2 style="color:#d97706;">Hesabınıza Yeni Bir Cihazdan Giriş Yapıldı</h2>
                  <p>Hesabınıza aşağıdaki cihaz/tarayıcı bilgileriyle giriş yapıldı:</p>
                  <table style="width:100%;border-collapse:collapse;margin:16px 0;">
                    <tr>
                      <td style="padding:8px;font-weight:bold;background:#f5f5f5;width:140px;">Cihaz / Tarayıcı</td>
                      <td style="padding:8px;background:#fafafa;">{encodedDeviceSummary}</td>
                    </tr>
                    <tr>
                      <td style="padding:8px;font-weight:bold;background:#f5f5f5;">Tarih ve Saat</td>
                      <td style="padding:8px;background:#fafafa;">{formattedTime}</td>
                    </tr>
                  </table>
                  <p>Bu girişi <strong>siz yaptıysanız</strong> bu e-postayı görmezden gelebilirsiniz.</p>
                  <p>Bu giriş <strong>size ait değilse</strong> aşağıdaki butona tıklayarak tüm oturumlarınızı sonlandırın ve şifrenizi sıfırlayın.</p>
                  <p style="text-align:center;margin:32px 0;">
                    <a href="{secureAccountLink}"
                       style="background-color:#dc2626;color:white;padding:14px 28px;text-decoration:none;border-radius:6px;font-weight:bold;display:inline-block;">
                      Bu Giriş Benim Değil &mdash; Hesabımı Güvenceye Al
                    </a>
                  </p>
                  <p style="font-size:12px;color:#666;">Bu bağlantı <strong>10 dakika</strong> geçerlidir.</p>
                  <p>— Cargo Pilot Ekibi</p>
                </div>
                """,
            Text = $"Hesabınıza yeni bir cihazdan giriş yapıldı.\n" +
                   $"Cihaz: {deviceSummary}\n" +
                   $"Tarih: {formattedTime}\n\n" +
                   $"Bu giriş size ait değilse hesabınızı güvenceye almak için şu bağlantıyı kullanın: {secureAccountLink}"
        };

        using var response = await _httpClient.PostAsJsonAsync("/emails", request, cancellationToken);
        if (!response.IsSuccessStatusCode)
        {
            var responseBody = await response.Content.ReadAsStringAsync(cancellationToken);
            LogResendSendFailure(_logger, (int)response.StatusCode, responseBody, null);
            response.EnsureSuccessStatusCode();
        }
    }

    public async Task SendPasswordChangedEmailAsync(
        string toEmail,
        string toName,
        CancellationToken cancellationToken = default)
    {
        var request = new ResendSendEmailRequest
        {
            From = string.IsNullOrWhiteSpace(_settings.FromName)
                ? _settings.FromEmail
                : $"{_settings.FromName} <{_settings.FromEmail}>",
            To = [toEmail],
            Subject = "Cargo Pilot — Şifreniz Başarıyla Değiştirildi",
            Html = $"""
                <div style="font-family:sans-serif;max-width:600px;margin:0 auto;color:#1a1a1a;">
                  <h2 style="color:#16a34a;">Şifreniz Başarıyla Değiştirildi</h2>
                  <p>Merhaba {toName},</p>
                  <p>Hesabınızın şifresi başarıyla güncellendi.</p>
                  <p>Bu değişikliği siz yapmadıysanız lütfen hemen hesabınızı güvenceye alın ve şifrenizi sıfırlayın.</p>
                  <p>— Cargo Pilot Ekibi</p>
                </div>
                """,
            Text = $"Merhaba {toName}, hesabınızın şifresi başarıyla güncellendi. Bu değişikliği siz yapmadıysanız lütfen hemen iletişime geçin."
        };

        using var response = await _httpClient.PostAsJsonAsync("/emails", request, cancellationToken);
        if (!response.IsSuccessStatusCode)
        {
            var responseBody = await response.Content.ReadAsStringAsync(cancellationToken);
            LogResendSendFailure(_logger, (int)response.StatusCode, responseBody, null);
            response.EnsureSuccessStatusCode();
        }
    }

    public async Task SendEmailChangeConfirmationEmailAsync(
        string toEmail,
        string toName,
        string confirmLink,
        CancellationToken cancellationToken = default)
    {
        var request = new ResendSendEmailRequest
        {
            From = string.IsNullOrWhiteSpace(_settings.FromName)
                ? _settings.FromEmail
                : $"{_settings.FromName} <{_settings.FromEmail}>",
            To = [toEmail],
            Subject = "Cargo Pilot — E-posta Adresi Değişikliği Onayı",
            Html = $"""
                <div style="font-family:sans-serif;max-width:600px;margin:0 auto;color:#1a1a1a;">
                  <h2 style="color:#d97706;">E-posta Adresi Değişikliği</h2>
                  <p>Merhaba {toName},</p>
                  <p>Hesabınızın e-posta adresini değiştirmek için bir istek aldık.</p>
                  <p>Değişikliği onaylamak için aşağıdaki bağlantıya tıklayın.
                  Bu bağlantı <strong>1 saat</strong> geçerlidir.</p>
                  <p style="text-align:center;margin:32px 0;">
                    <a href="{confirmLink}"
                       style="background-color:#2563eb;color:white;padding:14px 28px;text-decoration:none;border-radius:6px;font-weight:bold;display:inline-block;">
                      E-posta Değişikliğini Onayla
                    </a>
                  </p>
                  <p>Bu isteği siz yapmadıysanız bu e-postayı görmezden gelebilirsiniz. Hesabınızda herhangi bir değişiklik yapılmayacaktır.</p>
                  <p>— Cargo Pilot Ekibi</p>
                </div>
                """,
            Text = $"Merhaba {toName}, e-posta adresinizi değiştirmek için şu bağlantıyı kullanın (1 saat geçerli): {confirmLink}"
        };

        using var response = await _httpClient.PostAsJsonAsync("/emails", request, cancellationToken);
        if (!response.IsSuccessStatusCode)
        {
            var responseBody = await response.Content.ReadAsStringAsync(cancellationToken);
            LogResendSendFailure(_logger, (int)response.StatusCode, responseBody, null);
            response.EnsureSuccessStatusCode();
        }
    }

    public async Task SendCompanyUserInvitationEmailAsync(
        string toEmail,
        string toName,
        string temporaryPassword,
        string loginUrl,
        CancellationToken cancellationToken = default)
    {
        var encodedPassword = WebUtility.HtmlEncode(temporaryPassword);
        var encodedEmail = WebUtility.HtmlEncode(toEmail);

        var request = new ResendSendEmailRequest
        {
            From = string.IsNullOrWhiteSpace(_settings.FromName)
                ? _settings.FromEmail
                : $"{_settings.FromName} <{_settings.FromEmail}>",
            To = [toEmail],
            Subject = "Cargo Pilot — Hesabınız Oluşturuldu",
            Html = $"""
                <div style="font-family:sans-serif;max-width:600px;margin:0 auto;color:#1a1a1a;">
                  <h2 style="color:#1d4ed8;">Cargo Pilot'a Hoş Geldiniz</h2>
                  <p>Merhaba {toName},</p>
                  <p>Hesabınız oluşturuldu. Aşağıdaki bilgilerle giriş yapabilirsiniz:</p>
                  <table style="width:100%;border-collapse:collapse;margin:16px 0;">
                    <tr>
                      <td style="padding:8px;font-weight:bold;background:#f5f5f5;width:140px;">E-posta</td>
                      <td style="padding:8px;background:#fafafa;">{encodedEmail}</td>
                    </tr>
                    <tr>
                      <td style="padding:8px;font-weight:bold;background:#f5f5f5;">Geçici Şifre</td>
                      <td style="padding:8px;background:#fafafa;font-family:monospace;">{encodedPassword}</td>
                    </tr>
                  </table>
                  <p style="color:#dc2626;font-weight:bold;">İlk girişinizde şifrenizi değiştirmeniz zorunludur.</p>
                  {(string.IsNullOrWhiteSpace(loginUrl) ? string.Empty : $"""<p style="text-align:center;margin:32px 0;"><a href="{loginUrl}" style="background-color:#1d4ed8;color:white;padding:14px 28px;text-decoration:none;border-radius:6px;font-weight:bold;display:inline-block;">Giriş Yap</a></p>""")}
                  <p>— Cargo Pilot Ekibi</p>
                </div>
                """,
            Text = $"Merhaba {toName},\n\nHesabınız oluşturuldu.\nE-posta: {toEmail}\nGeçici Şifre: {temporaryPassword}\n\nİlk girişinizde şifrenizi değiştirmeniz zorunludur.\n\n— Cargo Pilot Ekibi"
        };

        using var response = await _httpClient.PostAsJsonAsync("/emails", request, cancellationToken);
        if (!response.IsSuccessStatusCode)
        {
            var responseBody = await response.Content.ReadAsStringAsync(cancellationToken);
            LogResendSendFailure(_logger, (int)response.StatusCode, responseBody, null);
            response.EnsureSuccessStatusCode();
        }
    }

    public async Task SendAccessRemovedEmailAsync(
        string toEmail,
        string toName,
        CancellationToken cancellationToken = default)
    {
        var request = new ResendSendEmailRequest
        {
            From = string.IsNullOrWhiteSpace(_settings.FromName)
                ? _settings.FromEmail
                : $"{_settings.FromName} <{_settings.FromEmail}>",
            To = [toEmail],
            Subject = "Cargo Pilot — Hesap Erişiminiz Kaldırıldı",
            Html = $"""
                <div style="font-family:sans-serif;max-width:600px;margin:0 auto;color:#1a1a1a;">
                  <h2 style="color:#dc2626;">Erişiminiz Kaldırıldı</h2>
                  <p>Merhaba {WebUtility.HtmlEncode(toName)},</p>
                  <p>Firma yöneticiniz tarafından Cargo Pilot hesabınıza erişiminiz kaldırılmıştır.</p>
                  <p>Bu konuda sorularınız varsa firma yöneticinizle iletişime geçebilirsiniz.</p>
                  <p>— Cargo Pilot Ekibi</p>
                </div>
                """,
            Text = $"Merhaba {toName},\n\nErişiminiz kaldırılmıştır.\n\nFirma yöneticinizle iletişime geçebilirsiniz.\n\n— Cargo Pilot Ekibi"
        };

        using var response = await _httpClient.PostAsJsonAsync("/emails", request, cancellationToken);
        if (!response.IsSuccessStatusCode)
        {
            var responseBody = await response.Content.ReadAsStringAsync(cancellationToken);
            LogResendSendFailure(_logger, (int)response.StatusCode, responseBody, null);
            response.EnsureSuccessStatusCode();
        }
    }

    private sealed class ResendSendEmailRequest
    {
        [JsonPropertyName("from")]
        public string From { get; init; } = null!;

        [JsonPropertyName("to")]
        public string[] To { get; init; } = [];

        [JsonPropertyName("subject")]
        public string Subject { get; init; } = null!;

        [JsonPropertyName("html")]
        public string Html { get; init; } = null!;

        [JsonPropertyName("text")]
        public string Text { get; init; } = null!;
    }
}
