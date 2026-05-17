using FluentValidation;

namespace CargoPilot.Application.Features.Contact.SendContactMessage;

public sealed class SendContactMessageCommandValidator : AbstractValidator<SendContactMessageCommand>
{
    public SendContactMessageCommandValidator()
    {
        RuleFor(x => x.Name)
            .NotEmpty().WithErrorCode("CONTACT_VAL_NAME_REQUIRED")
            .MinimumLength(2).WithErrorCode("CONTACT_VAL_NAME_TOO_SHORT")
            .MaximumLength(100).WithErrorCode("CONTACT_VAL_NAME_TOO_LONG");

        RuleFor(x => x.Email)
            .NotEmpty().WithErrorCode("CONTACT_VAL_EMAIL_REQUIRED")
            .EmailAddress().WithErrorCode("CONTACT_VAL_EMAIL_INVALID")
            .MaximumLength(200).WithErrorCode("CONTACT_VAL_EMAIL_TOO_LONG");

        RuleFor(x => x.Subject)
            .NotEmpty().WithErrorCode("CONTACT_VAL_SUBJECT_REQUIRED")
            .MinimumLength(3).WithErrorCode("CONTACT_VAL_SUBJECT_TOO_SHORT")
            .MaximumLength(200).WithErrorCode("CONTACT_VAL_SUBJECT_TOO_LONG");

        RuleFor(x => x.Message)
            .NotEmpty().WithErrorCode("CONTACT_VAL_MESSAGE_REQUIRED")
            .MinimumLength(10).WithErrorCode("CONTACT_VAL_MESSAGE_TOO_SHORT")
            .MaximumLength(2000).WithErrorCode("CONTACT_VAL_MESSAGE_TOO_LONG");
    }
}
