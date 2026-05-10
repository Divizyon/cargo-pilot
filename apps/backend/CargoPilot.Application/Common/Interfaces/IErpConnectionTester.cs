namespace CargoPilot.Application.Common.Interfaces;

public interface IErpConnectionTester
{
    Task<(bool Success, string Message)> TestAsync(string serverAddress, CancellationToken cancellationToken = default);
}
