using CargoPilot.Application.Common.Interfaces;
using CargoPilot.Application.Common.Models;
using CargoPilot.Application.Features.BusinessRules.GetBusinessRuleById;
using MediatR;

namespace CargoPilot.Application.Features.BusinessRules.ListBusinessRules;

public sealed class ListBusinessRulesQueryHandler
    : IRequestHandler<ListBusinessRulesQuery, Result<IReadOnlyList<BusinessRuleDto>>>
{
    private readonly IBusinessRuleRepository _repository;

    public ListBusinessRulesQueryHandler(IBusinessRuleRepository repository)
    {
        _repository = repository;
    }

    public async Task<Result<IReadOnlyList<BusinessRuleDto>>> Handle(
        ListBusinessRulesQuery request,
        CancellationToken cancellationToken)
    {
        var rules = await _repository.ListAllAsync(cancellationToken);

        var dtos = rules
            .Select(r => new BusinessRuleDto(
                r.Id,
                r.RuleName,
                r.RuleType,
                r.Description,
                r.LimitValue,
                r.PriorityLevel,
                r.IsHardConstraint,
                r.CreatedAtUtc,
                r.UpdatedAtUtc))
            .ToList();

        return Result<IReadOnlyList<BusinessRuleDto>>.Success(dtos);
    }
}
