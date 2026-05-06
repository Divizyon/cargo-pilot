using CargoPilot.Application.Common.Models;
using CargoPilot.Application.Features.BusinessRules.GetBusinessRuleById;
using MediatR;

namespace CargoPilot.Application.Features.BusinessRules.ListBusinessRules;

public sealed record ListBusinessRulesQuery : IRequest<Result<IReadOnlyList<BusinessRuleDto>>>;
