using CargoPilot.Application.Common.Models;
using MediatR;

namespace CargoPilot.Application.Features.Shares.DeleteShareLink;

public sealed record DeleteShareLinkCommand(Guid Id) : IRequest<Result<bool>>;
