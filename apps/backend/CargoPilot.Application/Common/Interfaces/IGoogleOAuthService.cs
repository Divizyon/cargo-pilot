namespace CargoPilot.Application.Common.Interfaces;

public interface IGoogleOAuthService
{
    string BuildAuthorizationUrl(string state);

    Task<string?> ExchangeCodeForIdTokenAsync(string code, CancellationToken cancellationToken = default);
}
