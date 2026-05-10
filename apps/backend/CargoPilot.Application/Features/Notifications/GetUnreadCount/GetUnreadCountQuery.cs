using CargoPilot.Application.Common.Models;
using MediatR;

namespace CargoPilot.Application.Features.Notifications.GetUnreadCount;

public sealed record GetUnreadCountQuery : IRequest<Result<int>>;
