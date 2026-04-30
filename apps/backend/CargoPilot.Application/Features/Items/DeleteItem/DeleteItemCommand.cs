using CargoPilot.Application.Common.Models;
using MediatR;

namespace CargoPilot.Application.Features.Items.DeleteItem;

public sealed record DeleteItemCommand(Guid Id) : IRequest<Result<Guid>>;
