using CargoPilot.Application.Common.Models;
using CargoPilot.Application.Features.Items.UpdateItem;
using MediatR;

namespace CargoPilot.Application.Features.Items.BulkUpdateItems;

public sealed record BulkUpdateItemsCommand(
    List<UpdateItemCommand> Items
) : IRequest<Result<BulkUpdateItemsResponse>>;

public sealed record BulkUpdateItemsResponse(int UpdatedCount);
