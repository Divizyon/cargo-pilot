using CargoPilot.Application.Common.Models;
using MediatR;

namespace CargoPilot.Application.Features.BusinessRules.DeleteBusinessRule;

public sealed record DeleteBusinessRuleCommand(Guid Id) : IRequest<Result<Guid>>;
