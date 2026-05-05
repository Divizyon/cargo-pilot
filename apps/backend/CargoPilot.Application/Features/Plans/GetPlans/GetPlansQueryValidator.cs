using FluentValidation;

namespace CargoPilot.Application.Features.Plans.GetPlans;

public sealed class GetPlansQueryValidator : AbstractValidator<GetPlansQuery>
{
    private static readonly HashSet<string> ValidSortFields = new(StringComparer.OrdinalIgnoreCase)
    {
        "createdAt", "planName", "fillRate", "optimizationStatus"
    };

    public GetPlansQueryValidator()
    {
        RuleFor(x => x.Page)
            .GreaterThanOrEqualTo(1)
                .WithErrorCode("PLAN_LIST_PAGE_MIN")
                .WithMessage("Sayfa numarası 1'den küçük olamaz.");

        RuleFor(x => x.PageSize)
            .InclusiveBetween(1, 100)
                .WithErrorCode("PLAN_LIST_PAGESIZE_RANGE")
                .WithMessage("Sayfa boyutu 1 ile 100 arasında olmalıdır.");

        RuleFor(x => x.SortBy)
            .Must(s => ValidSortFields.Contains(s))
                .WithErrorCode("PLAN_LIST_SORTBY_INVALID")
                .WithMessage("Geçerli sıralama alanları: createdAt, planName, fillRate, optimizationStatus.");

        RuleFor(x => x.SortDirection)
            .Must(d => string.Equals(d, "asc", StringComparison.OrdinalIgnoreCase)
                    || string.Equals(d, "desc", StringComparison.OrdinalIgnoreCase))
                .WithErrorCode("PLAN_LIST_SORTDIR_INVALID")
                .WithMessage("Sıralama yönü 'asc' veya 'desc' olmalıdır.");
    }
}
