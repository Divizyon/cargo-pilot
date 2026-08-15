using CargoPilot.Application.Common.Models;
using MediatR;

namespace CargoPilot.Application.Features.DraftItems.ReinstateDraftItem;

/// <summary>Reddedilmis taslagi tekrar karar bekler duruma alir.</summary>
public sealed record ReinstateDraftItemCommand(Guid Id) : IRequest<Result<Unit>>;
