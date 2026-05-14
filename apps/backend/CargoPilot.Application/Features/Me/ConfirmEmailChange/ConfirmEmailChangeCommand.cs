using CargoPilot.Application.Common.Models;
using MediatR;

namespace CargoPilot.Application.Features.Me.ConfirmEmailChange;

public sealed record ConfirmEmailChangeCommand(string Token) : IRequest<Result<bool>>;
