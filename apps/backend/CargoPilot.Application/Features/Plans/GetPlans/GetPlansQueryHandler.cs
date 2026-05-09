using CargoPilot.Application.Abstractions;
using CargoPilot.Application.Common.Interfaces;
using CargoPilot.Application.Common.Models;
using FluentValidation;
using MediatR;

namespace CargoPilot.Application.Features.Plans.GetPlans;

public sealed class GetPlansQueryHandler : IRequestHandler<GetPlansQuery, Result<PagedResult<PlanSummaryDto>>>
{
    private readonly ILoadingPlanRepository _repository;
    private readonly ICurrentUserService _currentUserService;
    private readonly IValidator<GetPlansQuery> _validator;

    public GetPlansQueryHandler(
        ILoadingPlanRepository repository,
        ICurrentUserService currentUserService,
        IValidator<GetPlansQuery> validator)
    {
        _repository = repository;
        _currentUserService = currentUserService;
        _validator = validator;
    }

    public async Task<Result<PagedResult<PlanSummaryDto>>> Handle(
        GetPlansQuery request,
        CancellationToken cancellationToken)
    {
        var validationResult = await _validator.ValidateAsync(request, cancellationToken);
        if (!validationResult.IsValid)
        {
            var failures = validationResult.Errors
                .Select(e => new ValidationFailure(e.PropertyName, e.ErrorMessage))
                .ToList();
            return Result<PagedResult<PlanSummaryDto>>.Failure(
                new Error(ErrorType.Validation, "Validation.Failed", "Doğrulama hatası.", failures));
        }

        var descending = string.Equals(request.SortDirection, "desc", StringComparison.OrdinalIgnoreCase);

        var pagedResult = await _repository.GetPagedAsync(
            request.Page,
            request.PageSize,
            request.SortBy,
            descending,
            _currentUserService.CompanyId,
            cancellationToken);

        return Result<PagedResult<PlanSummaryDto>>.Success(pagedResult);
    }
}
