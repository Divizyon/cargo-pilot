using FluentValidation;

namespace CargoPilot.Application.Features.Vehicles.SearchVehicles;

public sealed class SearchVehiclesQueryValidator : AbstractValidator<SearchVehiclesQuery> {
    public SearchVehiclesQueryValidator() {
        RuleFor(x => x.Page)
            .GreaterThanOrEqualTo(1)
                .WithErrorCode("VEHICLE_VAL_PAGE_MIN")
                .WithMessage("Sayfa numarası 1'den küçük olamaz.");

        RuleFor(x => x.PageSize)
            .InclusiveBetween(1, 100)
                .WithErrorCode("VEHICLE_VAL_PAGESIZE_RANGE")
                .WithMessage("Sayfa boyutu 1 ile 100 arasında olmalıdır.");

        RuleFor(x => x.SearchTerm)
            .MaximumLength(200)
                .WithErrorCode("VEHICLE_VAL_SEARCHTERM_TOO_LONG")
                .WithMessage("Arama terimi en fazla 200 karakter olabilir.")
            .When(x => x.SearchTerm is not null);

        RuleFor(x => x.VehicleType)
            .IsInEnum()
                .WithErrorCode("VEHICLE_VAL_VEHICLETYPE_INVALID")
                .WithMessage("Geçersiz araç tipi.")
            .When(x => x.VehicleType.HasValue);
    }
}
