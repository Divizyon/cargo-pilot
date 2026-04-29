using CargoPilot.Application.Common.Models;
using MediatR;

namespace CargoPilot.Application.Features.Items.GetItemById;

public sealed record GetItemByIdQuery(Guid Id) : IRequest<Result<ItemDetailDto>>;
