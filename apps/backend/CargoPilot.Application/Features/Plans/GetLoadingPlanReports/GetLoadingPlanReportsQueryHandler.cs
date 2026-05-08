using CargoPilot.Application.Common.Interfaces;
using CargoPilot.Application.Common.Models;
using FluentValidation;
using MediatR;

namespace CargoPilot.Application.Features.Plans.GetLoadingPlanReports;

public sealed class GetLoadingPlanReportsQueryHandler
    : IRequestHandler<GetLoadingPlanReportsQuery, Result<PagedResult<LoadingPlanReportDto>>>
{
    private readonly ILoadingPlanRepository _repository;
    private readonly IValidator<GetLoadingPlanReportsQuery> _validator;

    public GetLoadingPlanReportsQueryHandler(
        ILoadingPlanRepository repository,
        IValidator<GetLoadingPlanReportsQuery> validator)
    {
        _repository = repository;
        _validator = validator;
    }

    public async Task<Result<PagedResult<LoadingPlanReportDto>>> Handle(
        GetLoadingPlanReportsQuery request,
        CancellationToken cancellationToken)
    {
        var validationResult = await _validator.ValidateAsync(request, cancellationToken);
        if (!validationResult.IsValid)
        {
            var failures = validationResult.Errors
                .Select(e => new ValidationFailure(e.PropertyName, e.ErrorMessage))
                .ToList();
            return Result<PagedResult<LoadingPlanReportDto>>.Failure(
                new Error(ErrorType.Validation, "Validation.Failed", "Doğrulama hatası.", failures));
        }

        var pagedResult = await _repository.GetPagedReportsAsync(
            request.Page,
            request.PageSize,
            request.StartDate,
            request.EndDate,
            request.VehicleId,
            request.MinFillRate,
            request.MaxFillRate,
            cancellationToken);

        return Result<PagedResult<LoadingPlanReportDto>>.Success(pagedResult);
    }
}
