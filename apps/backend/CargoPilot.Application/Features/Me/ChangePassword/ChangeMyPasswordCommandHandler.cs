using CargoPilot.Application.Abstractions;
using CargoPilot.Application.Common.Interfaces;
using CargoPilot.Application.Common.Models;
using CargoPilot.Domain.Entities;
using FluentValidation;
using MediatR;
using Microsoft.Extensions.Logging;

namespace CargoPilot.Application.Features.Me.ChangePassword;

internal sealed class ChangeMyPasswordCommandHandler
    : IRequestHandler<ChangeMyPasswordCommand, Result<bool>>
{
    private static readonly Action<ILogger, Guid, Exception?> LogPasswordEmailFailed =
        LoggerMessage.Define<Guid>(
            LogLevel.Warning,
            new EventId(1001, nameof(LogPasswordEmailFailed)),
            "Şifre değişti bildirimi gönderilemedi. Kullanıcı: {UserId}");

    private readonly IUserRepository _userRepository;
    private readonly IUserSessionRepository _sessionRepository;
    private readonly IUserPasswordHistoryRepository _historyRepository;
    private readonly IPasswordHasher _passwordHasher;
    private readonly IEmailService _emailService;
    private readonly ICurrentUserService _currentUserService;
    private readonly ILogger<ChangeMyPasswordCommandHandler> _logger;

    public ChangeMyPasswordCommandHandler(
        IUserRepository userRepository,
        IUserSessionRepository sessionRepository,
        IUserPasswordHistoryRepository historyRepository,
        IPasswordHasher passwordHasher,
        IEmailService emailService,
        ICurrentUserService currentUserService,
        IValidator<ChangeMyPasswordCommand> validator,
        ILogger<ChangeMyPasswordCommandHandler> logger)
    {
        _userRepository = userRepository;
        _sessionRepository = sessionRepository;
        _historyRepository = historyRepository;
        _passwordHasher = passwordHasher;
        _emailService = emailService;
        _currentUserService = currentUserService;
        _logger = logger;
    }

    public async Task<Result<bool>> Handle(
        ChangeMyPasswordCommand request,
        CancellationToken cancellationToken)
    {
        if (_currentUserService.UserId is not { } userId)
            return Result<bool>.Failure(
                new Error(ErrorType.Unauthorized, "AUTH_UNAUTHORIZED", "Kimlik doğrulaması gereklidir."));

        var user = await _userRepository.GetByIdAsync(userId, cancellationToken);
        if (user is null)
            return Result<bool>.Failure(
                new Error(ErrorType.NotFound, "USER_NOT_FOUND", "Kullanıcı bulunamadı."));

        if (user.PasswordHash is null || !_passwordHasher.VerifyPassword(request.CurrentPassword, user.PasswordHash))
            return Result<bool>.Failure(
                new Error(ErrorType.BusinessRule, "ME_INVALID_CURRENT_PASSWORD", "Mevcut şifreniz hatalı."));

        if (_passwordHasher.VerifyPassword(request.NewPassword, user.PasswordHash))
            return Result<bool>.Failure(
                new Error(ErrorType.BusinessRule, "ME_PASSWORD_SAME_AS_CURRENT", "Yeni şifre mevcut şifreden farklı olmalıdır."));

        var recentHashes = await _historyRepository.GetLastHashesAsync(userId, 3, cancellationToken);
        if (recentHashes.Any(h => _passwordHasher.VerifyPassword(request.NewPassword, h)))
            return Result<bool>.Failure(
                new Error(ErrorType.BusinessRule, "ME_PASSWORD_RECENTLY_USED", "Bu şifre yakın zamanda kullanılmıştır. Lütfen farklı bir şifre seçin."));

        _historyRepository.Add(new UserPasswordHistory(Guid.NewGuid(), userId, user.PasswordHash));

        user.SetPassword(_passwordHasher.HashPassword(request.NewPassword));

        await _userRepository.SaveChangesAsync(cancellationToken);

        await _sessionRepository.RevokeAllAsync(userId, cancellationToken);

        try
        {
            await _emailService.SendPasswordChangedEmailAsync(
                user.Email,
                $"{user.FirstName} {user.LastName}",
                cancellationToken);
        }
        catch (Exception ex)
        {
            LogPasswordEmailFailed(_logger, userId, ex);
        }

        return Result<bool>.Success(true);
    }
}
