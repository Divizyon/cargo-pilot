using FluentValidation;

namespace CargoPilot.Application.Features.Vehicles.SearchVehicles;

public sealed class SearchVehiclesQueryValidator : AbstractValidator<SearchVehiclesQuery>
{
    public SearchVehiclesQueryValidator()
    {
        RuleFor(x => x.Page)
            .GreaterThanOrEqualTo(1)
                .WithErrorCode("VEHICLE_SEARCH_PAGE_MIN")
                .WithMessage("Sayfa numarası 1'den küçük olamaz.");

        RuleFor(x => x.PageSize)
            .InclusiveBetween(1, 100)
                .WithErrorCode("VEHICLE_SEARCH_PAGESIZE_RANGE")
                .WithMessage("Sayfa boyutu 1 ile 100 arasında olmalıdır.")
            .When(x => !x.IsExport);

        RuleFor(x => x.SearchTerm)
            .MaximumLength(200)
                .WithErrorCode("VEHICLE_SEARCH_TERM_TOO_LONG")
                .WithMessage("Arama terimi en fazla 200 karakter olabilir.")
            .When(x => x.SearchTerm is not null);
    }
}
