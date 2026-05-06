using CargoPilot.Application.Common.Models;
using CargoPilot.Domain.Enums;
using MediatR;

namespace CargoPilot.Application.Features.BusinessRules.CreateBusinessRule;

public sealed record CreateBusinessRuleCommand(
    string RuleName,
    RuleType RuleType,
    string Description,
    double LimitValue,
    int PriorityLevel,
    bool IsHardConstraint) : IRequest<Result<Guid>>;
