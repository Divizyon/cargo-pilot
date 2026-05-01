using System.Security.Cryptography;
using System.Text;
using CargoPilot.Application.Abstractions;
using CargoPilot.Application.Common.Errors;
using CargoPilot.Application.Common.Interfaces;
using CargoPilot.Application.Common.Models;
using CargoPilot.Application.Common.Settings;
using CargoPilot.Application.Features.Auth;
using CargoPilot.Application.Features.Auth.DTOs;
using CargoPilot.Domain.Entities;
using CargoPilot.Domain.Enums;
using CargoPilot.Infrastructure.Persistence;
using Google.Apis.Auth;
using Mapster;
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
    private readonly IUserRepository _userRepository;
    private readonly IPasswordResetTokenRepository _resetTokenRepository;
    private readonly IUserPasswordHistoryRepository _passwordHistoryRepository;
    private readonly IEmailService _emailService;
    private readonly PasswordResetSettings _passwordResetSettings;
    private readonly GoogleAuthSettings _googleSettings;

    public AuthService(
        AppDbContext context,
        IPasswordHasher passwordHasher,
        IJwtTokenService jwtTokenService,
        IOptions<JwtSettings> jwtSettings,
        IUserRepository userRepository,
        IPasswordResetTokenRepository resetTokenRepository,
        IUserPasswordHistoryRepository passwordHistoryRepository,
        IEmailService emailService,
        IOptions<PasswordResetSettings> passwordResetSettings,
        IOptions<GoogleAuthSettings> googleSettings)
    {
        _context = context;
        _passwordHasher = passwordHasher;
        _jwtTokenService = jwtTokenService;
        _jwtSettings = jwtSettings.Value;
        _userRepository = userRepository;
        _resetTokenRepository = resetTokenRepository;
        _passwordHistoryRepository = passwordHistoryRepository;
        _emailService = emailService;
        _passwordResetSettings = passwordResetSettings.Value;
        _googleSettings = googleSettings.Value;
    }

    public async Task<Result<LoginResponse>> LoginWithGoogleAsync(
        string idToken,
        string? ipAddress,
        CancellationToken cancellationToken = default)
    {
        // 1. Google ID token doğrula
        GoogleJsonWebSignature.Payload payload;
        try
        {
            var validationSettings = new GoogleJsonWebSignature.ValidationSettings
            {
                Audience = [_googleSettings.ClientId]
            };
            payload = await GoogleJsonWebSignature.ValidateAsync(idToken, validationSettings);
        }
        catch (InvalidJwtException)
        {
            return Result<LoginResponse>.Failure(AuthErrors.InvalidGoogleToken);
        }

        // 2. E-posta doğrulanmış mı?
        if (!payload.EmailVerified)
            return Result<LoginResponse>.Failure(AuthErrors.GoogleEmailNotVerified);

        // 3. Mapster ile payload → GoogleUserInfo
        var userInfo = payload.Adapt<GoogleUserInfo>();

        // 4. Mevcut UserLogin kaydını ara (sağlayıcı bağlantısı)
        var existingLogin = await _context.UserLogins
            .Include(ul => ul.User)
            .FirstOrDefaultAsync(
                ul => ul.LoginProvider == AuthProvider.Google && ul.ProviderKey == userInfo.GoogleId,
                cancellationToken);

        AppUser user;

        if (existingLogin is not null)
        {
            // Kayıtlı Google kullanıcısı — doğrudan oturum aç
            user = existingLogin.User;
        }
        else
        {
            // UserLogin yok — e-posta ile kullanıcı ara (account linking veya yeni kayıt)
            var normalizedEmail = userInfo.Email.Trim().ToLowerInvariant();
            var existingUser = await _context.Users
                .FirstOrDefaultAsync(u => u.Email == normalizedEmail, cancellationToken);

            if (existingUser is not null)
            {
                // Mevcut kullanıcıya Google hesabını bağla
                user = existingUser;
            }
            else
            {
                // Yeni kullanıcı oluştur
                user = new AppUser(
                    id: Guid.NewGuid(),
                    companyId: null,
                    firstName: string.IsNullOrEmpty(userInfo.FirstName) ? "Google" : userInfo.FirstName,
                    lastName: string.IsNullOrEmpty(userInfo.LastName) ? "User" : userInfo.LastName,
                    email: normalizedEmail,
                    passwordHash: null,
                    userType: UserType.CompanyWorker,
                    externalSystemId: userInfo.GoogleId,
                    authProvider: AuthProvider.Google);

                _context.Users.Add(user);
            }

            // Her iki yolda da Google bağlantısını oluştur
            _context.UserLogins.Add(new UserLogin(
                id: Guid.NewGuid(),
                loginProvider: AuthProvider.Google,
                providerKey: userInfo.GoogleId,
                userId: user.Id));
        }

        // 5. JWT + refresh token üret ve oturumu kaydet
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
            createdByIp: ipAddress));

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

    public async Task<Result<LoginResponse>> LoginAsync(
        LoginRequest request,
        string? ipAddress,
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

    public async Task<Result<bool>> RequestPasswordResetAsync(
        string email,
        CancellationToken cancellationToken = default)
    {
        var normalizedEmail = email.Trim().ToLowerInvariant();

        var user = await _userRepository.GetByEmailAsync(normalizedEmail, cancellationToken);

        // Account enumeration önleme: kullanıcı yok veya sosyal hesap olsa bile success dön (AC3)
        if (user is null || user.AuthProvider != AuthProvider.Local)
            return Result<bool>.Success(true);

        await _resetTokenRepository.InvalidateAllForUserAsync(user.Id, cancellationToken);

        var rawTokenBytes = RandomNumberGenerator.GetBytes(32);
        var rawToken = Convert.ToBase64String(rawTokenBytes)
            .Replace("+", "-").Replace("/", "_").TrimEnd('=');

        var tokenHash = Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(rawToken)));

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
        var tokenHash = Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(token)));

        var now = DateTime.UtcNow;
        var userId = await _resetTokenRepository.TryConsumeActiveTokenAsync(tokenHash, now, cancellationToken);
        if (userId is null)
            return Result<bool>.Failure(AuthErrors.InvalidResetToken);

        var user = await _userRepository.GetByIdAsync(userId.Value, cancellationToken);
        if (user is null)
            return Result<bool>.Failure(AuthErrors.InvalidResetToken);

        // Mevcut şifre kontrolü
        if (user.PasswordHash is not null && _passwordHasher.VerifyPassword(newPassword, user.PasswordHash))
            return Result<bool>.Failure(AuthErrors.PasswordAlreadyUsed);

        // Son 3 şifre geçmişi kontrolü (AC3)
        var recentHashes = await _passwordHistoryRepository.GetLastHashesAsync(user.Id, 3, cancellationToken);
        if (recentHashes.Any(h => _passwordHasher.VerifyPassword(newPassword, h)))
            return Result<bool>.Failure(AuthErrors.PasswordAlreadyUsed);

        // Eski şifreyi geçmişe ekle
        if (user.PasswordHash is not null)
        {
            _passwordHistoryRepository.Add(new UserPasswordHistory(
                id: Guid.NewGuid(),
                userId: user.Id,
                passwordHash: user.PasswordHash));
        }

        user.SetPassword(_passwordHasher.HashPassword(newPassword));

        // Tüm aktif oturumları iptal et (AC4)
        var activeSessions = await _context.UserSessions
            .Where(s => s.UserId == user.Id && !s.IsRevoked)
            .ToListAsync(cancellationToken);

        foreach (var session in activeSessions)
            session.Revoke();

        await _context.SaveChangesAsync(cancellationToken);

        return Result<bool>.Success(true);
    }
}
