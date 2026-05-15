using CargoPilot.Application.Common.Erp;
using CargoPilot.Application.Common.Interfaces;
using CargoPilot.Domain.Enums;

namespace CargoPilot.Infrastructure.Services.ErpConnectors;

internal sealed class NetsisErpConnector : IErpConnector
{
    private readonly IHttpClientFactory _httpClientFactory;

    public NetsisErpConnector(IHttpClientFactory httpClientFactory)
    {
        _httpClientFactory = httpClientFactory;
    }

    public ErpProviderType ProviderType => ErpProviderType.Netsis;

    public async Task<ErpConnectionResult> TestConnectionAsync(
        string serverAddress,
        string companyCode,
        string username,
        string password,
        CancellationToken cancellationToken = default)
    {
        try
        {
            using var client = _httpClientFactory.CreateClient();
            client.Timeout = TimeSpan.FromSeconds(10);
            await client.GetAsync(serverAddress, cancellationToken);
            return new ErpConnectionResult(true, null);
        }
        catch (HttpRequestException)
        {
            return new ErpConnectionResult(false, "Sunucuya ulaşılamadı. Sunucu adresini kontrol edin.");
        }
        catch (TaskCanceledException)
        {
            return new ErpConnectionResult(false, "Bağlantı zaman aşımına uğradı. Sunucu adresini kontrol edin.");
        }
    }
}
