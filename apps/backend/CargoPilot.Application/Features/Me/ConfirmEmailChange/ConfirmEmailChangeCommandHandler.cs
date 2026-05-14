using System.Security.Cryptography;
using CargoPilot.Application.Common.Interfaces;
using CargoPilot.Application.Common.Models;
using FluentValidation;
using MediatR;

namespace CargoPilot.Application.Features.Me.ConfirmEmailChange;

internal sealed class ConfirmEmailChangeCommandHandler
    : IRequestHandler<ConfirmEmailChangeCommand, Result<bool>>
{
    private readonly IUserRepository _userRepository;
    private readonly IUserSessionRepository _sessionRepository;
    private readonly IEmailChangeTokenRepository _tokenRepository;
    private readonly IValidator<ConfirmEmailChangeCommand> _validator;

    public ConfirmEmailChangeCommandHandler(
        IUserRepository userRepository,
        IUserSessionRepository sessionRepository,
        IEmailChangeTokenRepository tokenRepository,
        IValidator<ConfirmEmailChangeCommand> validator)
    {
        _userRepository = userRepository;
        _sessionRepository = sessionRepository;
        _tokenRepository = tokenRepository;
        _validator = validator;
    }

    public async Task<Result<bool>> Handle(
        ConfirmEmailChangeCommand request,
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

        var rawBytes = Base64UrlDecode(request.Token);
        if (rawBytes is null)
            return Result<bool>.Failure(
                new Error(ErrorType.BusinessRule, "ME_INVALID_EMAIL_CHANGE_TOKEN", "Geçersiz veya süresi dolmuş onay bağlantısı."));

        var tokenHash = Convert.ToHexString(SHA256.HashData(rawBytes));
        var utcNow = DateTime.UtcNow;

        var token = await _tokenRepository.GetActiveByTokenHashAsync(tokenHash, utcNow, cancellationToken);
        if (token is null)
            return Result<bool>.Failure(
                new Error(ErrorType.BusinessRule, "ME_INVALID_EMAIL_CHANGE_TOKEN", "Geçersiz veya süresi dolmuş onay bağlantısı."));

        var user = await _userRepository.GetByIdAsync(token.UserId, cancellationToken);
        if (user is null)
            return Result<bool>.Failure(
                new Error(ErrorType.NotFound, "USER_NOT_FOUND", "Kullanıcı bulunamadı."));

        if (await _userRepository.ExistsByEmailAsync(token.NewEmail, cancellationToken))
            return Result<bool>.Failure(
                new Error(ErrorType.Conflict, "ME_EMAIL_ALREADY_TAKEN", "Bu e-posta adresi başka bir hesap tarafından alınmıştır."));

        user.UpdateEmail(token.NewEmail);
        token.MarkAsUsed();

        await _tokenRepository.SaveChangesAsync(cancellationToken);

        await _sessionRepository.RevokeAllAsync(user.Id, cancellationToken);

        return Result<bool>.Success(true);
    }

    private static byte[]? Base64UrlDecode(string value) {
        try {
            var padded = value.Replace('-', '+').Replace('_', '/')
                .PadRight(value.Length + (4 - value.Length % 4) % 4, '=');
            return Convert.FromBase64String(padded);
        }
        catch (FormatException) {
            return null;
        }
    }
}
