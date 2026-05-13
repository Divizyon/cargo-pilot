using CargoPilot.Application.Abstractions;
using CargoPilot.Application.Common.Errors;
using CargoPilot.Application.Common.Interfaces;
using CargoPilot.Application.Common.Models;
using CargoPilot.Application.Common.Settings;
using CargoPilot.Application.Features.CompanyManagement.GetCompanyUsers;
using CargoPilot.Domain.Entities;
using CargoPilot.Domain.Enums;
using MediatR;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace CargoPilot.Application.Features.CompanyManagement.CreateCompanyUser;

internal sealed class CreateCompanyUserCommandHandler
    : IRequestHandler<CreateCompanyUserCommand, Result<CompanyUserDto>>
{
    private static readonly Action<ILogger, Guid, Exception?> LogInvitationEmailFailed =
        LoggerMessage.Define<Guid>(
            LogLevel.Error,
            new EventId(3001, nameof(LogInvitationEmailFailed)),
            "Davet e-postası gönderilemedi. UserId={UserId}");

    private readonly IUserRepository _userRepository;
    private readonly ICompanyRepository _companyRepository;
    private readonly IUserPasswordHistoryRepository _passwordHistoryRepository;
    private readonly IPasswordHasher _passwordHasher;
    private readonly IEmailService _emailService;
    private readonly ICurrentUserService _currentUserService;
    private readonly PasswordResetSettings _passwordResetSettings;
    private readonly ILogger<CreateCompanyUserCommandHandler> _logger;

    public CreateCompanyUserCommandHandler(
        IUserRepository userRepository,
        ICompanyRepository companyRepository,
        IUserPasswordHistoryRepository passwordHistoryRepository,
        IPasswordHasher passwordHasher,
        IEmailService emailService,
        ICurrentUserService currentUserService,
        IOptions<PasswordResetSettings> passwordResetSettings,
        ILogger<CreateCompanyUserCommandHandler> logger)
    {
        _userRepository = userRepository;
        _companyRepository = companyRepository;
        _passwordHistoryRepository = passwordHistoryRepository;
        _passwordHasher = passwordHasher;
        _emailService = emailService;
        _currentUserService = currentUserService;
        _passwordResetSettings = passwordResetSettings.Value;
        _logger = logger;
    }

    public async Task<Result<CompanyUserDto>> Handle(
        CreateCompanyUserCommand request,
        CancellationToken cancellationToken)
    {
        if (_currentUserService.CompanyId is not { } companyId)
            return Result<CompanyUserDto>.Failure(
                new Error(ErrorType.Unauthorized, "AUTH_UNAUTHORIZED", "Kimlik doğrulaması gereklidir."));

        var company = await _companyRepository.GetByIdAsync(companyId, cancellationToken);
        if (company is null)
            return Result<CompanyUserDto>.Failure(CompanyErrors.CompanyNotFound);

        var currentCount = await _userRepository.GetCompanyUserCountAsync(companyId, cancellationToken);
        if (currentCount >= company.MaxUserCount)
            return Result<CompanyUserDto>.Failure(CompanyErrors.UserLimitReached);

        var normalizedEmail = request.Email.Trim().ToLowerInvariant();
        if (await _userRepository.ExistsByEmailAsync(normalizedEmail, cancellationToken))
            return Result<CompanyUserDto>.Failure(CompanyErrors.EmailAlreadyExists);

        var userType = request.Role == "Admin" ? UserType.CompanyAdmin : UserType.CompanyWorker;
        var passwordHash = _passwordHasher.HashPassword(request.Password);

        var user = new AppUser(
            id: Guid.NewGuid(),
            companyId: companyId,
            firstName: request.FirstName.Trim(),
            lastName: request.LastName.Trim(),
            email: normalizedEmail,
            passwordHash: passwordHash,
            userType: userType,
            externalSystemId: null);

        user.SetMustChangePassword(true);

        _userRepository.Add(user);

        _passwordHistoryRepository.Add(new UserPasswordHistory(
            id: Guid.NewGuid(),
            userId: user.Id,
            passwordHash: passwordHash));

        await _userRepository.SaveChangesAsync(cancellationToken);

        var loginUrl = _passwordResetSettings.FrontendLoginUrl;
        try
        {
            await _emailService.SendCompanyUserInvitationEmailAsync(
                normalizedEmail,
                $"{user.FirstName} {user.LastName}",
                request.Password,
                loginUrl,
                cancellationToken);
        }
        catch (Exception ex)
        {
            LogInvitationEmailFailed(_logger, user.Id, ex);
        }

        return Result<CompanyUserDto>.Success(new CompanyUserDto(
            user.Id,
            user.FirstName,
            user.LastName,
            user.Email,
            request.Role,
            user.IsActive));
    }
}
