using CargoPilot.Application.Common.Models;
using MediatR;

namespace CargoPilot.Application.Features.DraftItems.ApproveDraftItems;

public sealed record ApproveDraftItemsCommand(IReadOnlyList<Guid> Ids) : IRequest<Result<ApproveDraftItemsResult>>;
