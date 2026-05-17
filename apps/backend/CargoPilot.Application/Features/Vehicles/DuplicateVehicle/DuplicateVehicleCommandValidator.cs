using FluentValidation;

namespace CargoPilot.Application.Features.Vehicles.DuplicateVehicle;

public sealed class DuplicateVehicleCommandValidator : AbstractValidator<DuplicateVehicleCommand> {
    public DuplicateVehicleCommandValidator() {
        RuleFor(x => x.Id)
            .NotEmpty()
            .WithMessage("Kaynak araç ID'si zorunludur.");

        RuleFor(x => x.VehicleName)
            .NotEmpty()
            .WithMessage("Araç adı zorunludur.")
            .MaximumLength(200)
            .WithMessage("Araç adı en fazla 200 karakter olabilir.");

        When(x => x.PlateNumber is not null, () =>
            RuleFor(x => x.PlateNumber!)
                .MaximumLength(50)
                .WithMessage("Plaka en fazla 50 karakter olabilir."));
    }
}
