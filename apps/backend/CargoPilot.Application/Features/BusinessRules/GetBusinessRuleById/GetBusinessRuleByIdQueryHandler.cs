using CargoPilot.Application.Common.Interfaces;
using CargoPilot.Application.Common.Models;
using MediatR;

namespace CargoPilot.Application.Features.BusinessRules.GetBusinessRuleById;

public sealed class GetBusinessRuleByIdQueryHandler : IRequestHandler<GetBusinessRuleByIdQuery, Result<BusinessRuleDto>>
{
    private readonly IBusinessRuleRepository _repository;

    public GetBusinessRuleByIdQueryHandler(IBusinessRuleRepository repository)
    {
        _repository = repository;
    }

    public async Task<Result<BusinessRuleDto>> Handle(
        GetBusinessRuleByIdQuery request,
        CancellationToken cancellationToken)
    {
        var rule = await _repository.GetByIdAsync(request.Id, cancellationToken);
        if (rule is null)
            return Result<BusinessRuleDto>.Failure(
                new Error(ErrorType.NotFound, "BusinessRule.NotFound", "Kural bulunamadı."));

        var dto = new BusinessRuleDto(
            rule.Id,
            rule.RuleName,
            rule.RuleType,
            rule.Description,
            rule.LimitValue,
            rule.PriorityLevel,
            rule.IsHardConstraint,
            rule.CreatedAtUtc,
            rule.UpdatedAtUtc);

        return Result<BusinessRuleDto>.Success(dto);
    }
}
