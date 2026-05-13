using FluentValidation;

namespace CargoPilot.Application.Features.Integrations.UpdateSyncSettings;

public sealed class UpdateSyncSettingsCommandValidator : AbstractValidator<UpdateSyncSettingsCommand>
{
    public UpdateSyncSettingsCommandValidator()
    {
        RuleFor(x => x.IntegrationId).NotEmpty();
        RuleFor(x => x.SyncFrequency)
            .IsInEnum()
            .When(x => x.SyncFrequency.HasValue);
    }
}
