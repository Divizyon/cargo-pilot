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

        RuleFor(x => x.PlateNumber)
            .NotEmpty()
            .WithMessage("Plaka zorunludur.")
            .MaximumLength(50)
            .WithMessage("Plaka en fazla 50 karakter olabilir.");
    }
}
