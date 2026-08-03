using CargoPilot.Application.Common.Interfaces;
using CargoPilot.Application.Common.Models;
using CargoPilot.Domain.Entities;
using CargoPilot.Domain.Enums;
using FluentValidation;
using MediatR;

namespace CargoPilot.Application.Features.Auth.Register;

public sealed class RegisterCommandHandler : IRequestHandler<RegisterCommand, Result<RegisterResponse>>
{
    private readonly IUserRepository _userRepository;
    private readonly ICompanyRepository _companyRepository;
    private readonly IPasswordHasher _passwordHasher;
    private readonly IValidator<RegisterCommand> _validator;

    public RegisterCommandHandler(
        IUserRepository userRepository,
        ICompanyRepository companyRepository,
        IPasswordHasher passwordHasher,
        IValidator<RegisterCommand> validator)
    {
        _userRepository = userRepository;
        _companyRepository = companyRepository;
        _passwordHasher = passwordHasher;
        _validator = validator;
    }

    public async Task<Result<RegisterResponse>> Handle(
        RegisterCommand request,
        CancellationToken cancellationToken)
    {
        var validationResult = await _validator.ValidateAsync(request, cancellationToken);
        if (!validationResult.IsValid)
        {
            var failures = validationResult.Errors
                .Select(e => new ValidationFailure(e.PropertyName, e.ErrorMessage))
                .ToList();
            return Result<RegisterResponse>.Failure(
                new Error(ErrorType.Validation, "Validation.Failed", "Doğrulama hatası.", failures));
        }

        var emailNormalized = request.Email.Trim().ToLowerInvariant();

        var emailExists = await _userRepository.ExistsByEmailAsync(emailNormalized, cancellationToken);
        if (emailExists)
        {
            return Result<RegisterResponse>.Failure(
                new Error(ErrorType.Conflict, "Auth.EmailAlreadyExists", "Bu e-posta adresi zaten kullanımda."));
        }

        var passwordHash = _passwordHasher.HashPassword(request.Password);

        var company = new Company(
            id: Guid.NewGuid(),
            name: $"Personal - {emailNormalized}",
            subscriptionType: SubscriptionType.Free);

        var user = new AppUser(
            id: Guid.NewGuid(),
            companyId: company.Id,
            firstName: request.FirstName.Trim(),
            lastName: request.LastName.Trim(),
            email: emailNormalized,
            passwordHash: passwordHash,
            userType: UserType.Individual,
            externalSystemId: null,
            authProvider: AuthProvider.Local);

        _companyRepository.Add(company);
        _userRepository.Add(user);
        await _userRepository.SaveChangesAsync(cancellationToken);

        return Result<RegisterResponse>.Success(
            new RegisterResponse(user.Id, user.FirstName, user.LastName, user.Email));
    }
}
