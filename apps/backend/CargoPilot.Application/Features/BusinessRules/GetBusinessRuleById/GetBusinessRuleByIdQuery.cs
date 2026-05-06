using CargoPilot.Application.Common.Models;
using MediatR;

namespace CargoPilot.Application.Features.BusinessRules.GetBusinessRuleById;

public sealed record GetBusinessRuleByIdQuery(Guid Id) : IRequest<Result<BusinessRuleDto>>;
