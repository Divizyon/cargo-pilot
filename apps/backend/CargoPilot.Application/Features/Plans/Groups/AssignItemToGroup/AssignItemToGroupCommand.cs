using CargoPilot.Application.Common.Models;
using MediatR;

namespace CargoPilot.Application.Features.Plans.Groups.AssignItemToGroup;

public sealed record AssignItemToGroupCommand(
    Guid PlanId,
    Guid InputItemId,
    Guid? GroupId) : IRequest<Result<Guid>>;
