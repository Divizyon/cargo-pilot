using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;
using CargoPilot.Application.Common.Interfaces;
using CargoPilot.Application.Common.Settings;
using CargoPilot.Domain.Entities;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.Tokens;

namespace CargoPilot.Infrastructure.Security;

internal sealed class JwtTokenService : IJwtTokenService
{
    
    private static readonly JwtSecurityTokenHandler _handler = new();

    private readonly JwtSettings _settings;
    private readonly SigningCredentials _credentials;

    public JwtTokenService(IOptions<JwtSettings> settings)
    {
        _settings = settings.Value;

        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(_settings.Secret));
        _credentials = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);
    }

    public string GenerateAccessToken(AppUser user)
    {
        var now = DateTime.UtcNow;

        var claims = new List<Claim>
        {
            new(JwtRegisteredClaimNames.Sub, user.Id.ToString()),
            new(JwtRegisteredClaimNames.Email, user.Email),
            new(JwtRegisteredClaimNames.GivenName, user.FirstName),
            new(JwtRegisteredClaimNames.FamilyName, user.LastName),
            new(JwtRegisteredClaimNames.Jti, Guid.NewGuid().ToString()),
            new("role", user.UserType.ToString()),
        };

        if (user.CompanyId.HasValue)
            claims.Add(new Claim("company_id", user.CompanyId.Value.ToString()));

        if (user.MustChangePassword)
            claims.Add(new Claim("mcp", "true"));

        var token = new JwtSecurityToken(
            issuer: _settings.Issuer,
            audience: _settings.Audience,
            claims: claims,
            notBefore: now,
            expires: now.AddMinutes(_settings.AccessTokenExpiryMinutes),
            signingCredentials: _credentials);

        return _handler.WriteToken(token);
    }

    public string GenerateRefreshToken() =>
        Convert.ToBase64String(RandomNumberGenerator.GetBytes(64));
}
