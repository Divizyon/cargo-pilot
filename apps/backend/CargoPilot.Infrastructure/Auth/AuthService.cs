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
        // AC3: IP lockout check runs before user lookup so unknown-email attempts are also counted.
        IpLoginAttempt? ipAttempt = null;
        if (!string.IsNullOrEmpty(ipAddress))
        {
            ipAttempt = await _context.IpLoginAttempts
                .FirstOrDefaultAsync(x => x.IpAddress == ipAddress, cancellationToken);

            if (ipAttempt is not null && ipAttempt.IsLockedOut())
            {
                var ipRemaining = (int)Math.Ceiling((ipAttempt.LockoutEndUtc!.Value - DateTime.UtcNow).TotalSeconds);
                return Result<LoginResponse>.Failure(AuthErrors.IpLocked(ipRemaining));
            }
        }

        var user = await _context.Users
            .FirstOrDefaultAsync(u => u.Email == request.Email, cancellationToken);

        // Always run BCrypt regardless of whether the user was found to prevent
        // timing-based email enumeration attacks.
        var hashToVerify = user?.PasswordHash ?? _dummyHash;
        var passwordValid = _passwordHasher.VerifyPassword(request.Password, hashToVerify);

        if (user is null)
        {
            // Still record the IP failed attempt so unknown-email brute-force triggers IP lockout.
            if (!string.IsNullOrEmpty(ipAddress))
            {
                if (ipAttempt is null)
                {
                    ipAttempt = new IpLoginAttempt(ipAddress);
                    _context.IpLoginAttempts.Add(ipAttempt);
                }
                ipAttempt.RecordFailedAttempt();
                await _context.SaveChangesAsync(cancellationToken);
            }

            return Result<LoginResponse>.Failure(AuthErrors.InvalidCredentials);
        }

        // AC1: User-based lockout check
        if (user.IsLockedOut())
        {
            var remainingSeconds = (int)Math.Ceiling((user.LockoutEndUtc!.Value - DateTime.UtcNow).TotalSeconds);
            return Result<LoginResponse>.Failure(AuthErrors.AccountLocked(remainingSeconds));
        }

        if (!passwordValid)
        {
            user.RecordFailedLogin();

            if (!string.IsNullOrEmpty(ipAddress))
            {
                if (ipAttempt is null)
                {
                    ipAttempt = new IpLoginAttempt(ipAddress);
                    _context.IpLoginAttempts.Add(ipAttempt);
                }
                ipAttempt.RecordFailedAttempt();
            }

            await _context.SaveChangesAsync(cancellationToken);

            // Return lock message immediately on the attempt that triggers lockout (AC2).
            if (user.IsLockedOut())
            {
                var remainingSeconds = (int)Math.Ceiling((user.LockoutEndUtc!.Value - DateTime.UtcNow).TotalSeconds);
                return Result<LoginResponse>.Failure(AuthErrors.AccountLocked(remainingSeconds));
            }

            return Result<LoginResponse>.Failure(AuthErrors.InvalidCredentials);
        }

        // AC4: reset on successful login
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
}
