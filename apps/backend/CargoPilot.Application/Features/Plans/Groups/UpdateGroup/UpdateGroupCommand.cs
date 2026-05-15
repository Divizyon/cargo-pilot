using CargoPilot.Application.Common.Models;
using MediatR;

namespace CargoPilot.Application.Features.Plans.Groups.UpdateGroup;

public sealed record UpdateGroupCommand(
    Guid PlanId,
    Guid GroupId,
    string Name,
    string Color,
    int UnloadingOrder) : IRequest<Result<Guid>>;
