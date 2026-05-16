namespace CargoPilot.Application.Common.Interfaces;

public interface IPayTRService
{
    Task<string> GetIframeTokenAsync(
        string merchantOid,
        string email,
        string userIp,
        long amountInKurus,
        string planName,
        CancellationToken cancellationToken = default);

    bool VerifyNotification(
        string merchantOid,
        string status,
        string totalAmount,
        string hash);
}
