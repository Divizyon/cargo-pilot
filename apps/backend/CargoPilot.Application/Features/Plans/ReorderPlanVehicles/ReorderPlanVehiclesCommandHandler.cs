using CargoPilot.Application.Abstractions;
using CargoPilot.Application.Common.Interfaces;
using CargoPilot.Application.Common.Models;
using FluentValidation;
using MediatR;

namespace CargoPilot.Application.Features.Plans.ReorderPlanVehicles;

public sealed class ReorderPlanVehiclesCommandHandler : IRequestHandler<ReorderPlanVehiclesCommand, Result<Guid>>
{
    private readonly ILoadingPlanRepository _planRepository;
    private readonly ICurrentUserService _currentUserService;
    private readonly IValidator<ReorderPlanVehiclesCommand> _validator;

    public ReorderPlanVehiclesCommandHandler(
        ILoadingPlanRepository planRepository,
        ICurrentUserService currentUserService,
        IValidator<ReorderPlanVehiclesCommand> validator)
    {
        _planRepository = planRepository;
        _currentUserService = currentUserService;
        _validator = validator;
    }

    public async Task<Result<Guid>> Handle(ReorderPlanVehiclesCommand request, CancellationToken cancellationToken)
    {
        var validationResult = await _validator.ValidateAsync(request, cancellationToken);
        if (!validationResult.IsValid)
        {
            var failures = validationResult.Errors
                .Select(e => new ValidationFailure(e.PropertyName, e.ErrorMessage))
                .ToList();
            return Result<Guid>.Failure(
                new Error(ErrorType.Validation, "Validation.Failed", "Doğrulama hatası.", failures));
        }

        var companyId = _currentUserService.CompanyId;

        var plan = await _planRepository.GetByIdAsync(request.PlanId, companyId, cancellationToken);
        if (plan is null)
            return Result<Guid>.Failure(
                new Error(ErrorType.NotFound, "Plan.NotFound", "Yükleme planı bulunamadı."));

        var existingVehicleIds = await _planRepository.GetPlanVehicleIdsAsync(request.PlanId, cancellationToken);

        var requestedSet = request.VehicleIds.ToHashSet();
        var existingSet = existingVehicleIds.ToHashSet();

        if (!requestedSet.SetEquals(existingSet))
            return Result<Guid>.Failure(
                new Error(ErrorType.Validation, "Plan.VehicleOrderMismatch",
                    "Gönderilen araç listesi, plandaki araçlarla eşleşmiyor."));

        await _planRepository.UpdateVehicleOrderAsync(request.PlanId, request.VehicleIds, cancellationToken);

        return Result<Guid>.Success(request.PlanId);
    }
}
