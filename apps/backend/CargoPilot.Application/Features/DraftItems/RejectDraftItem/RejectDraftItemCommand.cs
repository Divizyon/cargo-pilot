using CargoPilot.Application.Common.Models;
using MediatR;

namespace CargoPilot.Application.Features.DraftItems.RejectDraftItem;

public sealed record RejectDraftItemCommand(Guid Id) : IRequest<Result<Unit>>;
