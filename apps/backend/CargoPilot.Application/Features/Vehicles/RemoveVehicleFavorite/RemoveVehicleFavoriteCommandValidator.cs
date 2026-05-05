using FluentValidation;

namespace CargoPilot.Application.Features.Vehicles.RemoveVehicleFavorite;

public sealed class RemoveVehicleFavoriteCommandValidator : AbstractValidator<RemoveVehicleFavoriteCommand> {
    public RemoveVehicleFavoriteCommandValidator() {
        RuleFor(x => x.VehicleId)
            .NotEmpty()
                .WithErrorCode("VEHICLE_FAV_VAL_ID_REQUIRED")
                .WithMessage("Araç ID'si boş olamaz.");
    }
}
