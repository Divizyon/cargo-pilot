using FluentValidation;

namespace CargoPilot.Application.Features.Vehicles.ListCombined;

public sealed class ListVehiclesCombinedQueryValidator : AbstractValidator<ListVehiclesCombinedQuery> {
    public ListVehiclesCombinedQueryValidator() {
        RuleFor(x => x.Page)
            .GreaterThanOrEqualTo(1)
                .WithErrorCode("VEHICLE_COMBINED_PAGE_MIN")
                .WithMessage("Sayfa numarası 1'den küçük olamaz.");

        RuleFor(x => x.PageSize)
            .InclusiveBetween(1, 100)
                .WithErrorCode("VEHICLE_COMBINED_PAGESIZE_RANGE")
                .WithMessage("Sayfa boyutu 1 ile 100 arasında olmalıdır.");

        RuleFor(x => x.SearchTerm)
            .MaximumLength(200)
                .WithErrorCode("VEHICLE_COMBINED_SEARCHTERM_TOO_LONG")
                .WithMessage("Arama terimi en fazla 200 karakter olabilir.")
            .When(x => x.SearchTerm is not null);
    }
}
