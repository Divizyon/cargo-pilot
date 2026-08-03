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

        RuleFor(x => x.PlateNumber)
            .MaximumLength(20)
                .WithErrorCode("PLAN_LIST_PLATENUMBER_MAXLENGTH")
                .WithMessage("Plaka filtresi en fazla 20 karakter olabilir.")
            .When(x => x.PlateNumber is not null);

        RuleFor(x => x.VehicleIds)
            .Must(ids => ids!.Count <= 50)
                .WithErrorCode("PLAN_LIST_VEHICLEIDS_MAXCOUNT")
                .WithMessage("VehicleIds filtresi en fazla 50 araç ID'si içerebilir.")
            .When(x => x.VehicleIds is { Count: > 0 });

        RuleFor(x => x.PlanDateStart)
            .LessThanOrEqualTo(x => x.PlanDateEnd!.Value)
                .WithErrorCode("PLAN_LIST_DATERANGE_INVALID")
                .WithMessage("Başlangıç tarihi bitiş tarihinden büyük olamaz.")
            .When(x => x.PlanDateStart.HasValue && x.PlanDateEnd.HasValue);
    }
}
