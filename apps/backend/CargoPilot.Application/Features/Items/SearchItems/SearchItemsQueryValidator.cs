using FluentValidation;

namespace CargoPilot.Application.Features.Items.SearchItems;

public sealed class SearchItemsQueryValidator : AbstractValidator<SearchItemsQuery> {
    public SearchItemsQueryValidator() {
        RuleFor(x => x.Page)
            .GreaterThanOrEqualTo(1)
                .WithErrorCode("ITEM_SEARCH_PAGE_MIN")
                .WithMessage("Sayfa numarası 1'den küçük olamaz.");

        RuleFor(x => x.PageSize)
            .InclusiveBetween(1, 100)
                .WithErrorCode("ITEM_SEARCH_PAGESIZE_RANGE")
                .WithMessage("Sayfa boyutu 1 ile 100 arasında olmalıdır.");

        RuleFor(x => x.SearchTerm)
            .MaximumLength(200)
                .WithErrorCode("ITEM_SEARCH_TERM_TOO_LONG")
                .WithMessage("Arama terimi en fazla 200 karakter olabilir.")
            .When(x => x.SearchTerm is not null);
    }
}
