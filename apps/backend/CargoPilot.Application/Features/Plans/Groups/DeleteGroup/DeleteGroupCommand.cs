using CargoPilot.Application.Common.Models;
using MediatR;

namespace CargoPilot.Application.Features.Plans.Groups.DeleteGroup;

public sealed record DeleteGroupCommand(
    Guid PlanId,
    Guid GroupId,
    bool MoveItemsToNull) : IRequest<Result<Guid>>;
