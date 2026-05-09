using CargoPilot.Application.Abstractions;
using CargoPilot.Application.Common.Interfaces;
using CargoPilot.Application.Common.Models;
using FluentValidation;
using MediatR;

namespace CargoPilot.Application.Features.Plans.UpdatePlanName;

public sealed class UpdatePlanNameCommandHandler : IRequestHandler<UpdatePlanNameCommand, Result<Guid>>
{
    private readonly ILoadingPlanRepository _planRepository;
    private readonly ICurrentUserService _currentUserService;
    private readonly IValidator<UpdatePlanNameCommand> _validator;

    public UpdatePlanNameCommandHandler(
        ILoadingPlanRepository planRepository,
        ICurrentUserService currentUserService,
        IValidator<UpdatePlanNameCommand> validator)
    {
        _planRepository = planRepository;
        _currentUserService = currentUserService;
        _validator = validator;
    }

    public async Task<Result<Guid>> Handle(UpdatePlanNameCommand request, CancellationToken cancellationToken)
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

        var plan = await _planRepository.GetByIdAsync(request.Id, _currentUserService.CompanyId, cancellationToken);
        if (plan is null)
            return Result<Guid>.Failure(
                new Error(ErrorType.NotFound, "Plan.NotFound", "Yükleme planı bulunamadı."));

        plan.UpdatePlanName(request.PlanName);
        await _planRepository.SaveChangesAsync(cancellationToken);

        return Result<Guid>.Success(plan.Id);
    }
}
