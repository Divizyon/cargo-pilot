using CargoPilot.Application.Common.Interfaces;

namespace CargoPilot.Infrastructure.Services;

/// <summary>
/// PayTR key'leri henüz gelmeden local/test ortamında kullanılan mock servis.
/// Gerçek HTTP çağrısı yapmaz. Key'ler eklenince DI otomatik PayTRService'e geçer.
/// </summary>
internal sealed class MockPayTRService : IPayTRService
{
    public Task<string> GetIframeTokenAsync(
        string merchantOid,
        string email,
        string userIp,
        long amountInKurus,
        string planName,
        CancellationToken cancellationToken = default)
    {
        // Gerçek PayTR token formatını taklit eder; frontend bu prefix ile mock modda olduğunu anlar.
        var token = $"MOCK-{merchantOid}";
        return Task.FromResult(token);
    }

    public bool VerifyNotification(string merchantOid, string status, string totalAmount, string hash)
    {
        // Mock modda imza doğrulaması her zaman geçer.
        return true;
    }
}
