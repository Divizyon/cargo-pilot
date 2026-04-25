using CargoPilot.Application.Common.Interfaces;
using CargoPilot.Application.Common.Models;
using CargoPilot.Domain.Entities;
using CargoPilot.Domain.Enums;
using FluentValidation;

namespace CargoPilot.Application.Features.Auth.Register;

public sealed class RegisterCommandHandler {
    private readonly IUserRepository _userRepository;
    private readonly IPasswordHasher _passwordHasher;
    private readonly IValidator<RegisterCommand> _validator;

    public RegisterCommandHandler(
        IUserRepository userRepository,
        IPasswordHasher passwordHasher,
        IValidator<RegisterCommand> validator) {
        _userRepository = userRepository;
        _passwordHasher = passwordHasher;
        _validator = validator;
    }

    public async Task<Result<RegisterResponse>> HandleAsync(
        RegisterCommand command,
        CancellationToken cancellationToken = default) {

        var validationResult = await _validator.ValidateAsync(command, cancellationToken);
        if (!validationResult.IsValid) {
            var first = validationResult.Errors[0];
            return Result<RegisterResponse>.Failure(
                new Error(ErrorType.Validation, first.ErrorCode, first.ErrorMessage));
        }

        var emailNormalized = command.Email.Trim().ToLowerInvariant();

        var emailExists = await _userRepository.ExistsByEmailAsync(emailNormalized, cancellationToken);
        if (emailExists) {
            return Result<RegisterResponse>.Failure(
                new Error(
                    ErrorType.Conflict,
                    "Auth.EmailAlreadyExists",
                    "Bu e-posta adresi zaten kullanımda."));
        }

        var passwordHash = _passwordHasher.HashPassword(command.Password);

        var user = new AppUser(
            id: Guid.NewGuid(),
            companyId: null,
            firstName: command.FirstName.Trim(),
            lastName: command.LastName.Trim(),
            email: emailNormalized,
            passwordHash: passwordHash,
            userType: UserType.Individual,
            externalSystemId: null,
            authProvider: AuthProvider.Local);

        _userRepository.Add(user);
        await _userRepository.SaveChangesAsync(cancellationToken);

        return Result<RegisterResponse>.Success(
            new RegisterResponse(user.Id, user.FirstName, user.LastName, user.Email));
    }
}
