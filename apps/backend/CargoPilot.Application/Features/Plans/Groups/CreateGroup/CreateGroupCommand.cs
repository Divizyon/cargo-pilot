using CargoPilot.Application.Common.Models;
using MediatR;

namespace CargoPilot.Application.Features.Plans.Groups.CreateGroup;

public sealed record CreateGroupCommand(
    Guid PlanId,
    string Name,
    string Color,
    int UnloadingOrder) : IRequest<Result<Guid>>;
