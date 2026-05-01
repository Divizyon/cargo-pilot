using CargoPilot.Domain.Enums;

namespace CargoPilot.Application.Common.Interfaces;

public interface IOAuthTokenValidator
{
    AuthProvider Provider { get; }

    Task<OAuthUserInfo?> ValidateAsync(string idToken, CancellationToken cancellationToken = default);
}

public static class OAuthTokenValidatorExtensions
{
    public static bool Supports(this IOAuthTokenValidator validator, AuthProvider provider)
        => validator.Provider == provider;
}

public sealed record OAuthUserInfo(
    string Sub,
    string Email,
    bool EmailVerified,
    string? FirstName,
    string? LastName);