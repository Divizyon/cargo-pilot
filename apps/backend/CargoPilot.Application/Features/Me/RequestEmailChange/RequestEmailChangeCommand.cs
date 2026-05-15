using CargoPilot.Application.Common.Models;
using MediatR;

namespace CargoPilot.Application.Features.Me.RequestEmailChange;

public sealed record RequestEmailChangeCommand(string NewEmail) : IRequest<Result<bool>>;
