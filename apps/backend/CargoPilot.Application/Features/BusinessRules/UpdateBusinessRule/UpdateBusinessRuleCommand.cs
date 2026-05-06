using CargoPilot.Application.Common.Models;
using CargoPilot.Domain.Enums;
using MediatR;

namespace CargoPilot.Application.Features.BusinessRules.UpdateBusinessRule;

public sealed record UpdateBusinessRuleCommand(
    Guid Id,
    string RuleName,
    RuleType RuleType,
    string Description,
    double LimitValue,
    int PriorityLevel,
    bool IsHardConstraint) : IRequest<Result<Guid>>;
