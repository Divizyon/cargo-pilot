using CargoPilot.Application.Abstractions;
using CargoPilot.Application.Common.Interfaces;
using CargoPilot.Application.Common.Models;
using CargoPilot.Domain.Enums;
using FluentValidation;
using MediatR;
using Microsoft.Extensions.Logging;

namespace CargoPilot.Application.Features.CompanyUsers.UpdateCompanyUser;

internal sealed class UpdateCompanyUserCommandHandler : IRequestHandler<UpdateCompanyUserCommand, Result<Guid>>
{
    private static readonly Action<ILogger, Guid, Exception?> LogAccessRemovedEmailFailed =
        LoggerMessage.Define<Guid>(
            LogLevel.Warning,
            new EventId(3002, nameof(LogAccessRemovedEmailFailed)),
            "Erişim kaldırma e-postası gönderilemedi. UserId={UserId}");

    private readonly IUserRepository _userRepository;
    private readonly ICurrentUserService _currentUserService;
    private readonly IEmailService _emailService;
    private readonly IValidator<UpdateCompanyUserCommand> _validator;
    private readonly ILogger<UpdateCompanyUserCommandHandler> _logger;

    public UpdateCompanyUserCommandHandler(
        IUserRepository userRepository,
        ICurrentUserService currentUserService,
        IEmailService emailService,
        IValidator<UpdateCompanyUserCommand> validator,
        ILogger<UpdateCompanyUserCommandHandler> logger)
    {
        _userRepository = userRepository;
        _currentUserService = currentUserService;
        _emailService = emailService;
        _validator = validator;
        _logger = logger;
    }

    public async Task<Result<Guid>> Handle(UpdateCompanyUserCommand request, CancellationToken cancellationToken)
    {
        var validationResult = await _validator.ValidateAsync(request, cancellationToken);
        if (!validationResult.IsValid)
        {
            var failures = validationResult.Errors
                .Select(e => new ValidationFailure(e.PropertyName, e.ErrorMessage))
                .ToList();
            return Result<Guid>.Failure(
                new Error(ErrorType.Validation, "Validation.Failed", "Doğrulama hatası.", failures));
        }

        if (_currentUserService.UserType != UserType.CompanyAdmin)
            return Result<Guid>.Failure(
                new Error(ErrorType.Forbidden, "CompanyUser.Forbidden",
                    "Bu işlem yalnızca firma adminleri tarafından yapılabilir."));

        if (_currentUserService.CompanyId is not { } companyId)
            return Result<Guid>.Failure(
                new Error(ErrorType.Forbidden, "CompanyUser.NoCompany",
                    "Firma bağlamı bulunamadı."));

        if (_currentUserService.UserId == request.UserId)
            return Result<Guid>.Failure(
                new Error(ErrorType.BusinessRule, "CompanyUser.SelfModification",
                    "Kendi hesabınızı bu endpoint üzerinden güncelleyemezsiniz."));

        var targetUser = await _userRepository.GetByIdAsync(request.UserId, cancellationToken);
        if (targetUser is null || targetUser.CompanyId != companyId)
            return Result<Guid>.Failure(
                new Error(ErrorType.NotFound, "CompanyUser.NotFound",
                    "Kullanıcı bulunamadı veya bu firmaya ait değil."));

        // Son admin koruması: hedef kullanıcı CompanyAdmin ise ve role düşürülüyor ya da pasife alınıyorsa
        var targetIsAdmin = targetUser.UserType == UserType.CompanyAdmin;
        var willLoseAdminRole = targetIsAdmin &&
            (request.NewUserType.HasValue && request.NewUserType.Value != UserType.CompanyAdmin);
        var willBeDeactivated = request.IsActive.HasValue && !request.IsActive.Value;

        if (targetIsAdmin && (willLoseAdminRole || willBeDeactivated))
        {
            var activeAdminCount = await _userRepository.GetActiveAdminCountAsync(companyId, cancellationToken);
            if (activeAdminCount <= 1)
                return Result<Guid>.Failure(
                    new Error(ErrorType.BusinessRule, "CompanyUser.LastAdmin",
                        "Firmada en az bir admin bulunması zorunludur. Son adminin rolü düşürülemez veya pasife alınamaz."));
        }

        if (request.NewUserType.HasValue)
            targetUser.ChangeUserType(request.NewUserType.Value);

        var accessRemoved = false;
        if (willBeDeactivated && targetUser.IsActive)
        {
            targetUser.SetIsActive(false);
            accessRemoved = true;
        }
        else if (request.IsActive.HasValue && request.IsActive.Value && !targetUser.IsActive)
        {
            targetUser.SetIsActive(true);
        }

        if (accessRemoved)
            await _userRepository.RevokeAllSessionsAsync(targetUser.Id, cancellationToken);

        await _userRepository.SaveChangesAsync(cancellationToken);

        if (accessRemoved)
        {
            try
            {
                await _emailService.SendAccessRemovedEmailAsync(
                    targetUser.Email,
                    $"{targetUser.FirstName} {targetUser.LastName}",
                    cancellationToken);
            }
            catch (Exception ex)
            {
                LogAccessRemovedEmailFailed(_logger, targetUser.Id, ex);
            }
        }

        return Result<Guid>.Success(targetUser.Id);
    }
}
