using FluentValidation;

namespace CargoPilot.Application.Features.Plans.ReorderPlanVehicles;

public sealed class ReorderPlanVehiclesCommandValidator : AbstractValidator<ReorderPlanVehiclesCommand>
{
    public ReorderPlanVehiclesCommandValidator()
    {
        RuleFor(x => x.PlanId).NotEmpty();
        RuleFor(x => x.VehicleIds).NotEmpty();
        RuleForEach(x => x.VehicleIds).NotEmpty();
    }
}
