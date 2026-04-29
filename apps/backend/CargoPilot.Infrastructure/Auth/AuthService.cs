using CargoPilot.Application.Common.Errors;
using CargoPilot.Application.Common.Interfaces;
using CargoPilot.Application.Common.Models;
using CargoPilot.Application.Common.Settings;
using CargoPilot.Application.Features.Auth;
using CargoPilot.Application.Features.Auth.DTOs;
using CargoPilot.Domain.Entities;
using CargoPilot.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;

namespace CargoPilot.Infrastructure.Auth;

internal sealed class AuthService : IAuthService
{
    // Precomputed BCrypt hash used when the supplied email is not found in the database,
    // so the verify step runs for the same duration regardless of whether the account exists.
    // This prevents timing-based email enumeration attacks.
#pragma warning disable S2068
    private static readonly string _dummyHash =
        BCrypt.Net.BCrypt.HashPassword("__timing_protection__", workFactor: 11);
#pragma warning restore S2068

    private readonly AppDbContext _context;
    private readonly IPasswordHasher _passwordHasher;
    private readonly IJwtTokenService _jwtTokenService;
    private readonly JwtSettings _jwtSettings;

    public AuthService(
        AppDbContext context,
        IPasswordHasher passwordHasher,
        IJwtTokenService jwtTokenService,
        IOptions<JwtSettings> jwtSettings)
    {
        _context = context;
        _passwordHasher = passwordHasher;
        _jwtTokenService = jwtTokenService;
        _jwtSettings = jwtSettings.Value;
    }

    public async Task<Result<LoginResponse>> LoginAsync(
        LoginRequest request,
        string? ipAddress,
        CancellationToken cancellationToken = default)
    {
        var user = await _context.Users
            .FirstOrDefaultAsync(u => u.Email == request.Email, cancellationToken);

        // Always run BCrypt regardless of whether the user was found to prevent
        // timing-based email enumeration attacks.
        var hashToVerify = user?.PasswordHash ?? _dummyHash;
        var passwordValid = _passwordHasher.VerifyPassword(request.Password, hashToVerify);

        if (user is null)
            return Result<LoginResponse>.Failure(AuthErrors.InvalidCredentials);

        if (user.IsLockedOut())
        {
            var remaining = (int)Math.Ceiling((user.LockoutEndUtc!.Value - DateTime.UtcNow).TotalMinutes);
            return Result<LoginResponse>.Failure(AuthErrors.AccountLocked(remaining));
        }

        if (!passwordValid)
        {
            user.RecordFailedLogin();
            await _context.SaveChangesAsync(cancellationToken);
            return Result<LoginResponse>.Failure(AuthErrors.InvalidCredentials);
        }

        user.ResetLoginAttempts();

        var now = DateTime.UtcNow;
        var accessToken = _jwtTokenService.GenerateAccessToken(user);
        var refreshToken = _jwtTokenService.GenerateRefreshToken();
        var sessionExpiry = now.AddMinutes(_jwtSettings.RefreshTokenExpiryMinutes);

        var session = new UserSession(
            id: Guid.NewGuid(),
            userId: user.Id,
            token: refreshToken,
            expiresAt: sessionExpiry,
            lastUsedAt: now,
            createdByIp: ipAddress);

        _context.UserSessions.Add(session);
        await _context.SaveChangesAsync(cancellationToken);

        return Result<LoginResponse>.Success(new LoginResponse
        {
            UserId = user.Id,
            Email = user.Email,
            FullName = $"{user.FirstName} {user.LastName}",
            Role = user.UserType.ToString(),
            CompanyId = user.CompanyId,
            AccessToken = accessToken,
            RefreshToken = refreshToken,
            AccessTokenExpiresAt = now.AddMinutes(_jwtSettings.AccessTokenExpiryMinutes),
            RefreshTokenExpiresAt = sessionExpiry,
        });
    }

    public async Task<Result<RefreshResponse>> RefreshTokenAsync(
        string refreshToken,
        string? ipAddress,
        CancellationToken cancellationToken = default)
    {
        // 1. Gelen token ile oturumu ve sahibi kullanıcıyı birlikte çek
        var session = await _context.UserSessions
            .Include(s => s.User)
            .FirstOrDefaultAsync(s => s.Token == refreshToken, cancellationToken);

        // 2. Token yoksa, süresi geçmişse veya iptal edildiyse → 401
        if (session is null || session.IsRevoked || session.ExpiresAt <= DateTime.UtcNow)
            return Result<RefreshResponse>.Failure(AuthErrors.InvalidToken);

        // 3. Eski session'ı iptal et (Token Rotation — kullanılan token bir daha geçerli olmaz)
        session.Revoke();

        // 4. Yeni token çifti üret
        var now = DateTime.UtcNow;
        var newAccessToken  = _jwtTokenService.GenerateAccessToken(session.User);
        var newRefreshToken = _jwtTokenService.GenerateRefreshToken();
        var sessionExpiry   = now.AddMinutes(_jwtSettings.RefreshTokenExpiryMinutes);

        // 5. Yeni session'ı kaydet
        var newSession = new UserSession(
            id: Guid.NewGuid(),
            userId: session.UserId,
            token: newRefreshToken,
            expiresAt: sessionExpiry,
            lastUsedAt: now,
            createdByIp: ipAddress);

        _context.UserSessions.Add(newSession);
        await _context.SaveChangesAsync(cancellationToken);

        return Result<RefreshResponse>.Success(new RefreshResponse
        {
            AccessToken          = newAccessToken,
            AccessTokenExpiresAt = now.AddMinutes(_jwtSettings.AccessTokenExpiryMinutes),
            RefreshToken         = newRefreshToken,
            RefreshTokenExpiresAt = sessionExpiry,
        });
    }
}
