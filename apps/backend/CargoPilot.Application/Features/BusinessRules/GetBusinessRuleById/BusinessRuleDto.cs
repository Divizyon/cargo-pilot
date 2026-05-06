using CargoPilot.Domain.Enums;

namespace CargoPilot.Application.Features.BusinessRules.GetBusinessRuleById;

public sealed record BusinessRuleDto(
    Guid Id,
    string RuleName,
    RuleType RuleType,
    string Description,
    double LimitValue,
    int PriorityLevel,
    bool IsHardConstraint,
    DateTime CreatedAtUtc,
    DateTime? UpdatedAtUtc);
