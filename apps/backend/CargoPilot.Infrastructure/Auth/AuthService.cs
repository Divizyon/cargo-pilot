using System.Security.Cryptography;
using CargoPilot.Application.Abstractions;
using Microsoft.AspNetCore.WebUtilities;
using CargoPilot.Application.Common.Errors;
using CargoPilot.Application.Common.Interfaces;
using CargoPilot.Application.Common.Models;
using CargoPilot.Application.Common.Settings;
using CargoPilot.Application.Features.Auth;
using CargoPilot.Application.Features.Auth.DTOs;
using CargoPilot.Domain.Entities;
using CargoPilot.Domain.Enums;
using CargoPilot.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
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

    private static readonly Action<ILogger, Guid, Exception?> LogNewDeviceEmailFailed =
        LoggerMessage.Define<Guid>(
            LogLevel.Error,
            new EventId(2001, nameof(LogNewDeviceEmailFailed)),
            "Yeni cihaz uyarı e-postası gönderilemedi. UserId={UserId}");

    private readonly AppDbContext _context;
    private readonly IPasswordHasher _passwordHasher;
    private readonly IJwtTokenService _jwtTokenService;
    private readonly JwtSettings _jwtSettings;
    private readonly IUserRepository _userRepository;
    private readonly IEnumerable<IOAuthTokenValidator> _oauthValidators;
    private readonly IPasswordResetTokenRepository _resetTokenRepository;
    private readonly IUserPasswordHistoryRepository _passwordHistoryRepository;
    private readonly IEmailService _emailService;
    private readonly PasswordResetSettings _passwordResetSettings;
    private readonly ILogger<AuthService> _logger;

    public AuthService(
        AppDbContext context,
        IPasswordHasher passwordHasher,
        IJwtTokenService jwtTokenService,
        IOptions<JwtSettings> jwtSettings,
        IUserRepository userRepository,
        IEnumerable<IOAuthTokenValidator> oauthValidators,
        IPasswordResetTokenRepository resetTokenRepository,
        IUserPasswordHistoryRepository passwordHistoryRepository,
        IEmailService emailService,
        IOptions<PasswordResetSettings> passwordResetSettings,
        ILogger<AuthService> logger)
    {
        _context = context;
        _passwordHasher = passwordHasher;
        _jwtTokenService = jwtTokenService;
        _jwtSettings = jwtSettings.Value;
        _userRepository = userRepository;
        _oauthValidators = oauthValidators;
        _resetTokenRepository = resetTokenRepository;
        _passwordHistoryRepository = passwordHistoryRepository;
        _emailService = emailService;
        _passwordResetSettings = passwordResetSettings.Value;
        _logger = logger;
    }

    public async Task<Result<LoginResponse>> LoginAsync(
        LoginRequest request,
        string? ipAddress,
        string? userAgent,
        CancellationToken cancellationToken = default)
    {
        var normalizedEmail = request.Email.Trim().ToLowerInvariant();
        var user = await _context.Users
            .FirstOrDefaultAsync(u => u.Email == normalizedEmail, cancellationToken);

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

        return await IssueTokensAsync(user, ipAddress, userAgent, cancellationToken);
    }

    /// <inheritdoc/>
    public async Task<Result<LoginResponse>> OAuthLoginAsync(
        string idToken,
        AuthProvider provider,
        string? ipAddress,
        string? userAgent,
        CancellationToken cancellationToken = default)
    {
        var validator = _oauthValidators.FirstOrDefault(v => v.Supports(provider));
        if (validator is null)
            return Result<LoginResponse>.Failure(
                new Error(ErrorType.Validation, "OAuth.UnsupportedProvider",
                    $"'{provider}' sağlayıcısı desteklenmiyor."));

        OAuthUserInfo? userInfo;
        try
        {
            userInfo = await validator.ValidateAsync(idToken, cancellationToken);
        }
        catch (Exception ex) when (ex is HttpRequestException or TaskCanceledException)
        {
            return Result<LoginResponse>.Failure(
                new Error(ErrorType.Unexpected, "OAuth.ProviderUnavailable",
                    "Kimlik sağlayıcısına ulaşılamıyor. Lütfen tekrar deneyin."));
        }

        if (userInfo is null)
            return Result<LoginResponse>.Failure(
                new Error(ErrorType.Unauthorized, "OAuth.InvalidToken",
                    "Kimlik doğrulama token'ı geçersiz veya süresi dolmuş."));

        if (!userInfo.EmailVerified)
            return Result<LoginResponse>.Failure(
                new Error(ErrorType.Unauthorized, "OAuth.EmailNotVerified",
                    "E-posta adresi sağlayıcı tarafından doğrulanmamış."));

        var emailNormalized = userInfo.Email.Trim().ToLowerInvariant();

        var user = await _userRepository.FindByProviderAsync(provider, userInfo.Sub, cancellationToken);

        if (user is null)
        {
            var existingUser = await _userRepository.FindByEmailAsync(emailNormalized, cancellationToken);
            if (existingUser is not null)
            {
                var mergeLogin = new UserLogin(
                    id: Guid.NewGuid(),
                    loginProvider: provider,
                    providerKey: userInfo.Sub,
                    userId: existingUser.Id);

                _userRepository.AddUserLogin(mergeLogin);
                await _userRepository.SaveChangesAsync(cancellationToken);

                user = existingUser;
            }
            else
            {
                var firstName = userInfo.FirstName?.Trim() ?? emailNormalized.Split('@')[0];
                var lastName = userInfo.LastName?.Trim() ?? string.Empty;

                var newUser = new AppUser(
                    id: Guid.NewGuid(),
                    companyId: null,
                    firstName: firstName,
                    lastName: lastName,
                    email: emailNormalized,
                    passwordHash: null,
                    userType: UserType.Individual,
                    externalSystemId: userInfo.Sub,
                    authProvider: provider);

                var newLogin = new UserLogin(
                    id: Guid.NewGuid(),
                    loginProvider: provider,
                    providerKey: userInfo.Sub,
                    userId: newUser.Id);

                _userRepository.Add(newUser);
                _userRepository.AddUserLogin(newLogin);
                await _userRepository.SaveChangesAsync(cancellationToken);

                user = newUser;
            }
        }

        return await IssueTokensAsync(user, ipAddress, userAgent, cancellationToken);
    }

    /// <summary>Kullanıcı için JWT + refresh token üretir ve oturum kaydeder.</summary>
    private async Task<Result<LoginResponse>> IssueTokensAsync(
        AppUser user,
        string? ipAddress,
        string? userAgent,
        CancellationToken cancellationToken)
    {
        var deviceSummary = string.IsNullOrWhiteSpace(userAgent) ? null : userAgent.Trim();

        var isNewDevice = deviceSummary is not null &&
            !await _context.UserSessions
                .AnyAsync(s => s.UserId == user.Id && s.DeviceSummary == deviceSummary, cancellationToken);

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
            createdByIp: ipAddress,
            deviceSummary: deviceSummary);

        _context.UserSessions.Add(session);
        await _context.SaveChangesAsync(cancellationToken);

        if (isNewDevice && !string.IsNullOrWhiteSpace(_passwordResetSettings.BackendBaseUrl))
        {
            await _resetTokenRepository.InvalidateAllForUserAsync(user.Id, cancellationToken);

            var rawTokenBytes = RandomNumberGenerator.GetBytes(32);
            var rawToken = WebEncoders.Base64UrlEncode(rawTokenBytes);
            var tokenHash = Convert.ToHexString(SHA256.HashData(rawTokenBytes));

            _resetTokenRepository.Add(new PasswordResetToken(
                id: Guid.NewGuid(),
                userId: user.Id,
                tokenHash: tokenHash,
                expiresAt: now.AddMinutes(_passwordResetSettings.TokenExpiryMinutes)));

            await _resetTokenRepository.SaveChangesAsync(cancellationToken);

            var secureLink = $"{_passwordResetSettings.BackendBaseUrl}/api/v1/auth/secure-account" +
                $"?email={Uri.EscapeDataString(user.Email)}&token={Uri.EscapeDataString(rawToken)}";

            try
            {
                await _emailService.SendNewDeviceWarningEmailAsync(
                    user.Email,
                    deviceSummary!,
                    now,
                    secureLink,
                    cancellationToken);
            }
            catch (Exception ex)
            {
                // E-posta gönderimi başarısız olsa dahi login akışı durdurulmamalı.
                LogNewDeviceEmailFailed(_logger, user.Id, ex);
            }
        }

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
            MustChangePassword = user.MustChangePassword,
        });
    }

    public async Task<Result<RefreshResponse>> RefreshTokenAsync(
        string refreshToken,
        string? ipAddress,
        CancellationToken cancellationToken = default)
    {
        var session = await _context.UserSessions
            .Include(s => s.User)
            .FirstOrDefaultAsync(s => s.Token == refreshToken, cancellationToken);

        if (session is null || session.User is null)
            return Result<RefreshResponse>.Failure(AuthErrors.InvalidToken);

        // Revoke edilmiş token tekrar sunuluyorsa token çalınmış olabilir — tüm sessionları kapat.
        if (session.IsRevoked)
        {
            var activeSessions = await _context.UserSessions
                .Where(s => s.UserId == session.UserId && !s.IsRevoked)
                .ToListAsync(cancellationToken);
            foreach (var s in activeSessions)
                s.Revoke();
            await _context.SaveChangesAsync(cancellationToken);
            return Result<RefreshResponse>.Failure(AuthErrors.InvalidToken);
        }

        if (session.ExpiresAt <= DateTime.UtcNow)
            return Result<RefreshResponse>.Failure(AuthErrors.InvalidToken);

        // Atomik revoke: eş zamanlı istek bu token'ı zaten revoke ettiyse 0 döner, tüm sessionlar silinmez.
        var revokedCount = await _context.UserSessions
            .Where(s => s.Id == session.Id && !s.IsRevoked)
            .ExecuteUpdateAsync(s => s.SetProperty(x => x.IsRevoked, true), cancellationToken);

        if (revokedCount == 0)
            return Result<RefreshResponse>.Failure(AuthErrors.InvalidToken);

        var now = DateTime.UtcNow;
        var newAccessToken = _jwtTokenService.GenerateAccessToken(session.User);
        var newRefreshToken = _jwtTokenService.GenerateRefreshToken();
        var sessionExpiry = now.AddMinutes(_jwtSettings.RefreshTokenExpiryMinutes);

        var newSession = new UserSession(
            id: Guid.NewGuid(),
            userId: session.UserId,
            token: newRefreshToken,
            expiresAt: sessionExpiry,
            lastUsedAt: now,
            createdByIp: ipAddress,
            deviceSummary: session.DeviceSummary);

        _context.UserSessions.Add(newSession);
        await _context.SaveChangesAsync(cancellationToken);

        return Result<RefreshResponse>.Success(new RefreshResponse
        {
            AccessToken = newAccessToken,
            AccessTokenExpiresAt = now.AddMinutes(_jwtSettings.AccessTokenExpiryMinutes),
            RefreshToken = newRefreshToken,
            RefreshTokenExpiresAt = sessionExpiry,
        });
    }

    public async Task<Result<bool>> RequestPasswordResetAsync(
        string email,
        CancellationToken cancellationToken = default)
    {
        var normalizedEmail = email.Trim().ToLowerInvariant();

        var user = await _userRepository.GetByEmailAsync(normalizedEmail, cancellationToken);

        if (user is null || user.AuthProvider != AuthProvider.Local)
            return Result<bool>.Success(true);

        await _resetTokenRepository.InvalidateAllForUserAsync(user.Id, cancellationToken);

        var rawTokenBytes = RandomNumberGenerator.GetBytes(32);
        var rawToken = WebEncoders.Base64UrlEncode(rawTokenBytes);
        var tokenHash = Convert.ToHexString(SHA256.HashData(rawTokenBytes));

        var resetToken = new PasswordResetToken(
            id: Guid.NewGuid(),
            userId: user.Id,
            tokenHash: tokenHash,
            expiresAt: DateTime.UtcNow.AddMinutes(_passwordResetSettings.TokenExpiryMinutes));

        _resetTokenRepository.Add(resetToken);
        await _resetTokenRepository.SaveChangesAsync(cancellationToken);

        var resetLink = $"{_passwordResetSettings.FrontendResetUrl}?token={rawToken}";

        await _emailService.SendPasswordResetEmailAsync(
            user.Email,
            $"{user.FirstName} {user.LastName}",
            resetLink,
            cancellationToken);

        return Result<bool>.Success(true);
    }

    public async Task<Result<bool>> ResetPasswordAsync(
        string token,
        string newPassword,
        CancellationToken cancellationToken = default)
    {
        byte[] resetTokenBytes;
        try { resetTokenBytes = WebEncoders.Base64UrlDecode(token); }
        catch (FormatException) { return Result<bool>.Failure(AuthErrors.InvalidResetToken); }

        var tokenHash = Convert.ToHexString(SHA256.HashData(resetTokenBytes));

        var now = DateTime.UtcNow;
        var userId = await _resetTokenRepository.TryConsumeActiveTokenAsync(tokenHash, now, cancellationToken);
        if (userId is null)
            return Result<bool>.Failure(AuthErrors.InvalidResetToken);

        var user = await _userRepository.GetByIdAsync(userId.Value, cancellationToken);
        if (user is null)
            return Result<bool>.Failure(AuthErrors.InvalidResetToken);

        if (user.PasswordHash is not null && _passwordHasher.VerifyPassword(newPassword, user.PasswordHash))
            return Result<bool>.Failure(AuthErrors.PasswordAlreadyUsed);

        var recentHashes = await _passwordHistoryRepository.GetLastHashesAsync(user.Id, 3, cancellationToken);
        if (recentHashes.Any(h => _passwordHasher.VerifyPassword(newPassword, h)))
            return Result<bool>.Failure(AuthErrors.PasswordAlreadyUsed);

        if (user.PasswordHash is not null)
        {
            _passwordHistoryRepository.Add(new UserPasswordHistory(
                id: Guid.NewGuid(),
                userId: user.Id,
                passwordHash: user.PasswordHash));
        }

        user.SetPassword(_passwordHasher.HashPassword(newPassword));

        var activeSessions = await _context.UserSessions
            .Where(s => s.UserId == user.Id && !s.IsRevoked)
            .ToListAsync(cancellationToken);

        foreach (var session in activeSessions)
            session.Revoke();

        await _context.SaveChangesAsync(cancellationToken);

        return Result<bool>.Success(true);
    }

    public async Task<Result<bool>> LogoutAsync(
        string refreshToken,
        CancellationToken cancellationToken = default)
    {
        var session = await _context.UserSessions
            .FirstOrDefaultAsync(s => s.Token == refreshToken, cancellationToken);

        if (session is null || session.IsRevoked)
            return Result<bool>.Success(true);

        session.Revoke();
        await _context.SaveChangesAsync(cancellationToken);

        return Result<bool>.Success(true);
    }

    public async Task<Result<ForceChangePasswordResponse>> ForceChangePasswordAsync(
        Guid userId,
        string currentPassword,
        string newPassword,
        CancellationToken cancellationToken = default)
    {
        var user = await _userRepository.GetByIdAsync(userId, cancellationToken);
        if (user is null)
            return Result<ForceChangePasswordResponse>.Failure(AuthErrors.InvalidCredentials);

        if (user.PasswordHash is null || !_passwordHasher.VerifyPassword(currentPassword, user.PasswordHash))
            return Result<ForceChangePasswordResponse>.Failure(AuthErrors.InvalidCredentials);

        var recentHashes = await _passwordHistoryRepository.GetLastHashesAsync(user.Id, 3, cancellationToken);
        if (recentHashes.Any(h => _passwordHasher.VerifyPassword(newPassword, h)))
            return Result<ForceChangePasswordResponse>.Failure(AuthErrors.PasswordAlreadyUsed);

        if (user.PasswordHash is not null)
        {
            _passwordHistoryRepository.Add(new UserPasswordHistory(
                id: Guid.NewGuid(),
                userId: user.Id,
                passwordHash: user.PasswordHash));
        }

        user.SetPassword(_passwordHasher.HashPassword(newPassword));
        user.SetMustChangePassword(false);

        var activeSessions = await _context.UserSessions
            .Where(s => s.UserId == user.Id && !s.IsRevoked)
            .ToListAsync(cancellationToken);
        foreach (var session in activeSessions)
            session.Revoke();

        var now = DateTime.UtcNow;
        var accessToken = _jwtTokenService.GenerateAccessToken(user);
        var refreshToken = _jwtTokenService.GenerateRefreshToken();
        var sessionExpiry = now.AddMinutes(_jwtSettings.RefreshTokenExpiryMinutes);

        _context.UserSessions.Add(new UserSession(
            id: Guid.NewGuid(),
            userId: user.Id,
            token: refreshToken,
            expiresAt: sessionExpiry,
            lastUsedAt: now,
            createdByIp: null,
            deviceSummary: null));

        await _context.SaveChangesAsync(cancellationToken);

        return Result<ForceChangePasswordResponse>.Success(new ForceChangePasswordResponse
        {
            AccessToken = accessToken,
            AccessTokenExpiresAt = now.AddMinutes(_jwtSettings.AccessTokenExpiryMinutes),
            RefreshToken = refreshToken,
            RefreshTokenExpiresAt = sessionExpiry,
        });
    }

    public async Task<Result<string>> SecureAccountAsync(
        string email,
        string token,
        CancellationToken cancellationToken = default)
    {
        byte[] secureTokenBytes;
        try { secureTokenBytes = WebEncoders.Base64UrlDecode(token); }
        catch (FormatException) { return Result<string>.Failure(AuthErrors.InvalidResetToken); }

        var tokenHash = Convert.ToHexString(SHA256.HashData(secureTokenBytes));
        var now = DateTime.UtcNow;

        var userId = await _resetTokenRepository.TryConsumeActiveTokenAsync(tokenHash, now, cancellationToken);
        if (userId is null)
            return Result<string>.Failure(AuthErrors.InvalidResetToken);

        var user = await _userRepository.GetByIdAsync(userId.Value, cancellationToken);
        if (user is null)
            return Result<string>.Failure(AuthErrors.InvalidResetToken);

        var activeSessions = await _context.UserSessions
            .Where(s => s.UserId == user.Id && !s.IsRevoked)
            .ToListAsync(cancellationToken);

        foreach (var session in activeSessions)
            session.Revoke();

        await _resetTokenRepository.InvalidateAllForUserAsync(user.Id, cancellationToken);

        var newRawTokenBytes = RandomNumberGenerator.GetBytes(32);
        var newRawToken = WebEncoders.Base64UrlEncode(newRawTokenBytes);
        var newTokenHash = Convert.ToHexString(SHA256.HashData(newRawTokenBytes));

        _resetTokenRepository.Add(new PasswordResetToken(
            id: Guid.NewGuid(),
            userId: user.Id,
            tokenHash: newTokenHash,
            expiresAt: now.AddMinutes(_passwordResetSettings.TokenExpiryMinutes)));

        await _context.SaveChangesAsync(cancellationToken);

        var redirectUrl = $"{_passwordResetSettings.FrontendResetUrl}?token={Uri.EscapeDataString(newRawToken)}";
        return Result<string>.Success(redirectUrl);
    }
}