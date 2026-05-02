using FluentValidation;

namespace CargoPilot.Application.Features.Vehicles.SetVehicleStatus;

public sealed class SetVehicleStatusCommandValidator : AbstractValidator<SetVehicleStatusCommand> {
    public SetVehicleStatusCommandValidator() {
        RuleFor(x => x.Id)
            .NotEmpty()
                .WithErrorCode("VEHICLE_STATUS_ID_REQUIRED")
                .WithMessage("Araç ID'si zorunludur.");
    }
}
