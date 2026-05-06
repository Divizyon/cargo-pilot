using CargoPilot.Application.Common.Interfaces;
using CargoPilot.Application.Common.Models;
using CargoPilot.Domain.Entities;
using FluentValidation;
using MediatR;

namespace CargoPilot.Application.Features.BusinessRules.CreateBusinessRule;

public sealed class CreateBusinessRuleCommandHandler : IRequestHandler<CreateBusinessRuleCommand, Result<Guid>>
{
    private readonly IBusinessRuleRepository _repository;
    private readonly IValidator<CreateBusinessRuleCommand> _validator;

    public CreateBusinessRuleCommandHandler(
        IBusinessRuleRepository repository,
        IValidator<CreateBusinessRuleCommand> validator)
    {
        _repository = repository;
        _validator = validator;
    }

    public async Task<Result<Guid>> Handle(
        CreateBusinessRuleCommand request,
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

        var rule = new BusinessRule(
            id: Guid.NewGuid(),
            ruleName: request.RuleName,
            ruleType: request.RuleType,
            description: request.Description,
            limitValue: request.LimitValue,
            priorityLevel: request.PriorityLevel,
            isHardConstraint: request.IsHardConstraint);

        _repository.Add(rule);
        await _repository.SaveChangesAsync(cancellationToken);

        return Result<Guid>.Success(rule.Id);
    }
}
