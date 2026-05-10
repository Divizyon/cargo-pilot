using CargoPilot.Application.Common.Interfaces;

namespace CargoPilot.Infrastructure.Services;

public sealed class ErpConnectionTester : IErpConnectionTester
{
    private readonly IHttpClientFactory _httpClientFactory;

    public ErpConnectionTester(IHttpClientFactory httpClientFactory)
    {
        _httpClientFactory = httpClientFactory;
    }

    public async Task<(bool Success, string Message)> TestAsync(string serverAddress, CancellationToken cancellationToken = default)
    {
        if (!Uri.TryCreate(serverAddress.TrimEnd('/'), UriKind.Absolute, out var uri))
            return (false, "Sunucu adresi geçerli bir URL formatında değil.");

        try
        {
            using var httpClient = _httpClientFactory.CreateClient();
            httpClient.Timeout = TimeSpan.FromSeconds(10);

            using var cts = CancellationTokenSource.CreateLinkedTokenSource(cancellationToken);
            cts.CancelAfter(TimeSpan.FromSeconds(10));

            var response = await httpClient.GetAsync(uri, HttpCompletionOption.ResponseHeadersRead, cts.Token);
            return (true, $"Sunucuya bağlantı başarılı. HTTP {(int)response.StatusCode} yanıtı alındı.");
        }
        catch (TaskCanceledException)
        {
            return (false, "Bağlantı zaman aşımına uğradı. Sunucu adresi ve ağ bağlantısını kontrol edin.");
        }
        catch (HttpRequestException ex)
        {
            return (false, $"Sunucuya ulaşılamadı: {ex.Message}");
        }
        catch (Exception)
        {
            return (false, "Bağlantı testi sırasında beklenmeyen bir hata oluştu.");
        }
    }
}
