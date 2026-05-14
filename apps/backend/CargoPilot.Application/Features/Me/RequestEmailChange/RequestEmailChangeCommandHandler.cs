using System.Security.Cryptography;
using CargoPilot.Application.Abstractions;
using CargoPilot.Application.Common.Interfaces;
using CargoPilot.Application.Common.Models;
using CargoPilot.Application.Common.Settings;
using CargoPilot.Domain.Entities;
using FluentValidation;
using MediatR;
using Microsoft.Extensions.Logging;

namespace CargoPilot.Application.Features.Me.RequestEmailChange;

internal sealed class RequestEmailChangeCommandHandler
    : IRequestHandler<RequestEmailChangeCommand, Result<bool>>
{
    private static readonly Action<ILogger, Guid, Exception?> LogEmailChangeMailFailed =
        LoggerMessage.Define<Guid>(
            LogLevel.Warning,
            new EventId(1001, nameof(LogEmailChangeMailFailed)),
            "E-posta değişikliği onay maili gönderilemedi. Kullanıcı: {UserId}");

    private readonly IUserRepository _userRepository;
    private readonly IEmailChangeTokenRepository _tokenRepository;
    private readonly IEmailService _emailService;
    private readonly ICurrentUserService _currentUserService;
    private readonly IValidator<RequestEmailChangeCommand> _validator;
    private readonly EmailChangeSettings _settings;
    private readonly ILogger<RequestEmailChangeCommandHandler> _logger;

    public RequestEmailChangeCommandHandler(
        IUserRepository userRepository,
        IEmailChangeTokenRepository tokenRepository,
        IEmailService emailService,
        ICurrentUserService currentUserService,
        IValidator<RequestEmailChangeCommand> validator,
        EmailChangeSettings settings,
        ILogger<RequestEmailChangeCommandHandler> logger)
    {
        _userRepository = userRepository;
        _tokenRepository = tokenRepository;
        _emailService = emailService;
        _currentUserService = currentUserService;
        _validator = validator;
        _settings = settings;
        _logger = logger;
    }

    public async Task<Result<bool>> Handle(
        RequestEmailChangeCommand request,
        CancellationToken cancellationToken)
    {
        var validationResult = await _validator.ValidateAsync(request, cancellationToken);
        if (!validationResult.IsValid)
        {
            var failures = validationResult.Errors
                .Select(e => new ValidationFailure(e.PropertyName, e.ErrorMessage))
                .ToList();
            return Result<bool>.Failure(
                new Error(ErrorType.Validation, "Validation.Failed", "Doğrulama hatası.", failures));
        }

        if (_currentUserService.UserId is not { } userId)
            return Result<bool>.Failure(
                new Error(ErrorType.Unauthorized, "AUTH_UNAUTHORIZED", "Kimlik doğrulaması gereklidir."));

        var user = await _userRepository.GetByIdAsync(userId, cancellationToken);
        if (user is null)
            return Result<bool>.Failure(
                new Error(ErrorType.NotFound, "USER_NOT_FOUND", "Kullanıcı bulunamadı."));

        var normalizedNewEmail = request.NewEmail.Trim().ToLowerInvariant();

        if (normalizedNewEmail == user.Email)
            return Result<bool>.Failure(
                new Error(ErrorType.BusinessRule, "ME_EMAIL_SAME_AS_CURRENT", "Yeni e-posta adresi mevcut adresinizden farklı olmalıdır."));

        if (await _userRepository.ExistsByEmailAsync(normalizedNewEmail, cancellationToken))
            return Result<bool>.Failure(
                new Error(ErrorType.Conflict, "ME_EMAIL_ALREADY_TAKEN", "Bu e-posta adresi zaten kullanılmaktadır."));

        await _tokenRepository.InvalidatePendingForUserAsync(userId, cancellationToken);

        var rawBytes = RandomNumberGenerator.GetBytes(32);
        var rawToken = Base64UrlEncode(rawBytes);
        var tokenHash = Convert.ToHexString(SHA256.HashData(rawBytes));

        var expiry = DateTime.UtcNow.AddMinutes(_settings.TokenExpiryMinutes);
        _tokenRepository.Add(new EmailChangeToken(Guid.NewGuid(), userId, normalizedNewEmail, tokenHash, expiry));

        await _tokenRepository.SaveChangesAsync(cancellationToken);

        var confirmLink = $"{_settings.FrontendConfirmUrl}?token={rawToken}";

        try
        {
            await _emailService.SendEmailChangeConfirmationEmailAsync(
                user.Email,
                $"{user.FirstName} {user.LastName}",
                confirmLink,
                cancellationToken);
        }
        catch (Exception ex)
        {
            LogEmailChangeMailFailed(_logger, userId, ex);
        }

        return Result<bool>.Success(true);
    }

    private static string Base64UrlEncode(byte[] bytes) =>
        Convert.ToBase64String(bytes)
            .Replace('+', '-')
            .Replace('/', '_')
            .TrimEnd('=');
}
