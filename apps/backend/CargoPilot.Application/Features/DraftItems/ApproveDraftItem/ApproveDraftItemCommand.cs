using CargoPilot.Application.Common.Models;
using MediatR;

namespace CargoPilot.Application.Features.DraftItems.ApproveDraftItem;

public sealed record ApproveDraftItemCommand(Guid Id) : IRequest<Result<Guid>>;
