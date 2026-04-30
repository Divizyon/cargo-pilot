using System.Net.Http.Json;
using System.Net.Http.Headers;
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
