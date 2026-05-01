using CargoPilot.Application.Features.Auth.DTOs;
using FluentValidation;

namespace CargoPilot.Application.Features.Auth.Validators;

public sealed class GoogleAuthRequestValidator : AbstractValidator<GoogleAuthRequest>
{
    public GoogleAuthRequestValidator()
    {
        RuleFor(x => x.IdToken)
            .NotEmpty().WithMessage("Google kimlik doğrulama tokeni zorunludur.");
    }
}
