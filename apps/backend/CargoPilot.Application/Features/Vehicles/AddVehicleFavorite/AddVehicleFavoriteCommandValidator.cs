using FluentValidation;

namespace CargoPilot.Application.Features.Vehicles.AddVehicleFavorite;

public sealed class AddVehicleFavoriteCommandValidator : AbstractValidator<AddVehicleFavoriteCommand> {
    public AddVehicleFavoriteCommandValidator() {
        RuleFor(x => x.VehicleId)
            .NotEmpty()
                .WithErrorCode("VEHICLE_FAV_VAL_ID_REQUIRED")
                .WithMessage("Araç ID'si boş olamaz.");
    }
}
