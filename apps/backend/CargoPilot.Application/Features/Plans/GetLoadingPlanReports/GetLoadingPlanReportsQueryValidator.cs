using FluentValidation;

namespace CargoPilot.Application.Features.Plans.GetLoadingPlanReports;

public sealed class GetLoadingPlanReportsQueryValidator : AbstractValidator<GetLoadingPlanReportsQuery>
{
    public GetLoadingPlanReportsQueryValidator()
    {
        RuleFor(x => x.Page)
            .GreaterThanOrEqualTo(1)
                .WithErrorCode("REPORT_LIST_PAGE_MIN")
                .WithMessage("Sayfa numarası 1'den küçük olamaz.");

        RuleFor(x => x.PageSize)
            .InclusiveBetween(1, 100)
                .WithErrorCode("REPORT_LIST_PAGESIZE_RANGE")
                .WithMessage("Sayfa boyutu 1 ile 100 arasında olmalıdır.");

        RuleFor(x => x.MinFillRate)
            .InclusiveBetween(0m, 100m)
                .WithErrorCode("REPORT_LIST_MINFILLRATE_RANGE")
                .WithMessage("Minimum doluluk oranı 0 ile 100 arasında olmalıdır.")
            .When(x => x.MinFillRate.HasValue);

        RuleFor(x => x.MaxFillRate)
            .InclusiveBetween(0m, 100m)
                .WithErrorCode("REPORT_LIST_MAXFILLRATE_RANGE")
                .WithMessage("Maksimum doluluk oranı 0 ile 100 arasında olmalıdır.")
            .When(x => x.MaxFillRate.HasValue);

        RuleFor(x => x)
            .Must(x => x.MinFillRate is null || x.MaxFillRate is null || x.MinFillRate <= x.MaxFillRate)
                .WithErrorCode("REPORT_LIST_FILLRATE_ORDER")
                .WithMessage("Minimum doluluk oranı, maksimumdan büyük olamaz.")
                .When(x => x.MinFillRate.HasValue && x.MaxFillRate.HasValue);

        RuleFor(x => x)
            .Must(x => x.StartDate is null || x.EndDate is null || x.StartDate <= x.EndDate)
                .WithErrorCode("REPORT_LIST_DATE_ORDER")
                .WithMessage("Başlangıç tarihi, bitiş tarihinden sonra olamaz.")
                .When(x => x.StartDate.HasValue && x.EndDate.HasValue);
    }
}
