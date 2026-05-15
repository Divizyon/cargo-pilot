using FluentValidation;

namespace CargoPilot.Application.Features.CompanyUsers.UpdateCompanyUser;

public sealed class UpdateCompanyUserCommandValidator : AbstractValidator<UpdateCompanyUserCommand>
{
    public UpdateCompanyUserCommandValidator()
    {
        RuleFor(x => x.UserId)
            .NotEmpty().WithMessage("Kullanıcı ID boş olamaz.");

        RuleFor(x => x)
            .Must(x => x.NewUserType.HasValue || x.IsActive.HasValue)
            .WithMessage("En az bir alan (NewUserType veya IsActive) belirtilmelidir.");
    }
}
