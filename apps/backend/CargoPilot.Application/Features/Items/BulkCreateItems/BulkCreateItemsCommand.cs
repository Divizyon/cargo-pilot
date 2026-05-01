using CargoPilot.Application.Common.Models;
using CargoPilot.Application.Features.Items.CreateItem;
using MediatR;

namespace CargoPilot.Application.Features.Items.BulkCreateItems;

public sealed record BulkCreateItemsCommand(
    List<CreateItemCommand> Items
) : IRequest<Result<BulkCreateItemsResponse>>;

public sealed record BulkCreateItemsResponse(int SavedCount);
