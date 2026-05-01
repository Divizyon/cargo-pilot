using Google.Apis.Auth;
using Mapster;

namespace CargoPilot.Infrastructure.Auth;

internal static class GoogleAuthMappingConfig
{
    internal static void Register()
    {
        TypeAdapterConfig<GoogleJsonWebSignature.Payload, GoogleUserInfo>.NewConfig()
            .Map(dest => dest.GoogleId, src => src.Subject)
            .Map(dest => dest.Email, src => src.Email)
            .Map(dest => dest.FirstName, src => src.GivenName ?? string.Empty)
            .Map(dest => dest.LastName, src => src.FamilyName ?? string.Empty);
    }
}
