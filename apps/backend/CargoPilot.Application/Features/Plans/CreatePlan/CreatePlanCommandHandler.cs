using CargoPilot.Application.Common.Interfaces;
using CargoPilot.Application.Common.Models;
using CargoPilot.Domain.Entities;
using FluentValidation;
using MediatR;

namespace CargoPilot.Application.Features.Plans.CreatePlan;

public sealed class CreatePlanCommandHandler : IRequestHandler<CreatePlanCommand, Result<Guid>>
{
    private readonly ILoadingPlanRepository _planRepository;
    private readonly IVehicleRepository _vehicleRepository;
    private readonly IOptimizationEngine _optimizationEngine;
    private readonly IValidator<CreatePlanCommand> _validator;

    public CreatePlanCommandHandler(
        ILoadingPlanRepository planRepository,
        IVehicleRepository vehicleRepository,
        IOptimizationEngine optimizationEngine,
        IValidator<CreatePlanCommand> validator)
    {
        _planRepository = planRepository;
        _vehicleRepository = vehicleRepository;
        _optimizationEngine = optimizationEngine;
        _validator = validator;
    }

    public async Task<Result<Guid>> Handle(CreatePlanCommand request, CancellationToken cancellationToken)
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

        var vehicle = await _vehicleRepository.GetByIdAsync(request.VehicleId, cancellationToken);
        if (vehicle is null)
            return Result<Guid>.Failure(
                new Error(ErrorType.NotFound, "Vehicle.NotFound", "Araç bulunamadı."));

        var inputTotalQuantity = request.Items.Sum(i => i.Quantity);

        var plan = new LoadingPlan(
            id: Guid.NewGuid(),
            planName: request.PlanName,
            vehicleId: request.VehicleId,
            optimizationCriteria: request.OptimizationCriteria,
            inputTotalQuantity: inputTotalQuantity,
            companyId: vehicle.CompanyId);

        _planRepository.Add(plan);
        await _planRepository.SaveChangesAsync(cancellationToken);

        await _optimizationEngine.RunOptimizationAsync(plan.Id, cancellationToken);

        return Result<Guid>.Success(plan.Id);
    }
}
