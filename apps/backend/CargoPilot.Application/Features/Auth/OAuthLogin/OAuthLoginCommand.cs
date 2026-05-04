using CargoPilot.Application.Common.Models;
using CargoPilot.Application.Features.Auth.DTOs;
using CargoPilot.Domain.Enums;
using MediatR;

namespace CargoPilot.Application.Features.Auth.OAuthLogin;

/// <summary>
/// Google veya Microsoft ID token'ı ile giriş / kayıt isteği.
/// </summary>
/// <param name="IdToken">Frontend'den gelen OAuth ID token.</param>
/// <param name="Provider">Google veya Microsoft.</param>
/// <param name="IpAddress">İstemci IP'si (oturum kaydı için).</param>
/// <param name="UserAgent">İstemci User-Agent başlığı (cihaz tespiti için).</param>
public sealed record OAuthLoginCommand(
    string IdToken,
    AuthProvider Provider,
    string? IpAddress,
    string? UserAgent) : IRequest<Result<LoginResponse>>;
