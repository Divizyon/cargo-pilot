using CargoPilot.Application.Common.Interfaces;
using CargoPilot.Application.Common.Models;
using FluentValidation;
using MediatR;

namespace CargoPilot.Application.Features.BusinessRules.UpdateBusinessRule;

public sealed class UpdateBusinessRuleCommandHandler : IRequestHandler<UpdateBusinessRuleCommand, Result<Guid>>
{
    private readonly IBusinessRuleRepository _repository;
    private readonly IValidator<UpdateBusinessRuleCommand> _validator;

    public UpdateBusinessRuleCommandHandler(
        IBusinessRuleRepository repository,
        IValidator<UpdateBusinessRuleCommand> validator)
    {
        _repository = repository;
        _validator = validator;
    }

    public async Task<Result<Guid>> Handle(
        UpdateBusinessRuleCommand request,
        CancellationToken cancellationToken)
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

        var rule = await _repository.GetByIdAsync(request.Id, cancellationToken);
        if (rule is null)
            return Result<Guid>.Failure(
                new Error(ErrorType.NotFound, "BusinessRule.NotFound", "Kural bulunamadı."));

        rule.Update(
            ruleName: request.RuleName,
            ruleType: request.RuleType,
            description: request.Description,
            limitValue: request.LimitValue,
            priorityLevel: request.PriorityLevel,
            isHardConstraint: request.IsHardConstraint);

        _repository.Update(rule);
        await _repository.SaveChangesAsync(cancellationToken);

        return Result<Guid>.Success(rule.Id);
    }
}
