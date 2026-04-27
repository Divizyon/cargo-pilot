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
    private readonly IUserRepository _userRepository;
    private readonly IEnumerable<IOAuthTokenValidator> _oauthValidators;

    public AuthService(
        AppDbContext context,
        IPasswordHasher passwordHasher,
        IJwtTokenService jwtTokenService,
        IOptions<JwtSettings> jwtSettings,
        IUserRepository userRepository,
        IEnumerable<IOAuthTokenValidator> oauthValidators)
    {
        _context = context;
        _passwordHasher = passwordHasher;
        _jwtTokenService = jwtTokenService;
        _jwtSettings = jwtSettings.Value;
        _userRepository = userRepository;
        _oauthValidators = oauthValidators;
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

        return await IssueTokensAsync(user, ipAddress, cancellationToken);
    }

    /// <inheritdoc/>
    public async Task<Result<LoginResponse>> OAuthLoginAsync(
        string idToken,
        CargoPilot.Domain.Enums.AuthProvider provider,
        string? ipAddress,
        CancellationToken cancellationToken = default)
    {
        // AC9: Doğru validator'ı seç ve token'ı doğrula.
        var validator = ResolveValidator(provider);
        if (validator is null)
            return Result<LoginResponse>.Failure(
                new Error(ErrorType.Validation, "OAuth.UnsupportedProvider",
                    $"'{provider}' sağlayıcısı desteklenmiyor."));

        var userInfo = await validator.ValidateAsync(idToken, cancellationToken);
        if (userInfo is null)
            return Result<LoginResponse>.Failure(
                new Error(ErrorType.Unauthorized, "OAuth.InvalidToken",
                    "Kimlik doğrulama token'ı geçersiz veya süresi dolmuş."));

        var emailNormalized = userInfo.Email.Trim().ToLowerInvariant();

        // Önce provider + sub ile bak (en kesin eşleşme)
        var user = await _userRepository.FindByProviderAsync(provider, userInfo.Sub, cancellationToken);

        if (user is null)
        {
            // AC11: E-posta DB'de var ama bu provider'la giriş kaydı yok → hesap birleştirme
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
                // AC10: Yeni kullanıcı oluştur
                var firstName = userInfo.FirstName?.Trim() ?? emailNormalized.Split('@')[0];
                var lastName  = userInfo.LastName?.Trim()  ?? string.Empty;

                var newUser = new AppUser(
                    id: Guid.NewGuid(),
                    companyId: null,
                    firstName: firstName,
                    lastName: lastName,
                    email: emailNormalized,
                    passwordHash: null,          // OAuth kullanıcılarında şifre yok
                    userType: CargoPilot.Domain.Enums.UserType.Individual,
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

        return await IssueTokensAsync(user, ipAddress, cancellationToken);
    }

    /// <summary>Kullanıcı için JWT + refresh token üretir ve oturum kaydeder.</summary>
    private async Task<Result<LoginResponse>> IssueTokensAsync(
        AppUser user,
        string? ipAddress,
        CancellationToken cancellationToken)
    {
        var now = DateTime.UtcNow;
        var accessToken  = _jwtTokenService.GenerateAccessToken(user);
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
            UserId               = user.Id,
            Email                = user.Email,
            FullName             = $"{user.FirstName} {user.LastName}",
            Role                 = user.UserType.ToString(),
            CompanyId            = user.CompanyId,
            AccessToken          = accessToken,
            RefreshToken         = refreshToken,
            AccessTokenExpiresAt  = now.AddMinutes(_jwtSettings.AccessTokenExpiryMinutes),
            RefreshTokenExpiresAt = sessionExpiry,
        });
    }

    /// <summary>
    /// Provider enum'una göre kayıtlı validator'ı döner.
    /// DI'dan gelen validator listesini tip adına göre eşleştirir.
    /// </summary>
    private IOAuthTokenValidator? ResolveValidator(CargoPilot.Domain.Enums.AuthProvider provider) =>
        provider switch
        {
            CargoPilot.Domain.Enums.AuthProvider.Google    => _oauthValidators.OfType<GoogleTokenValidator>().FirstOrDefault(),
            CargoPilot.Domain.Enums.AuthProvider.Microsoft => _oauthValidators.OfType<MicrosoftTokenValidator>().FirstOrDefault(),
            _                                              => null
        };
}
