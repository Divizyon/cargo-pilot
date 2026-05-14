using CargoPilot.Application.Common.Models;
using MediatR;

namespace CargoPilot.Application.Features.Me.ChangePassword;

public sealed record ChangeMyPasswordCommand(
    string CurrentPassword,
    string NewPassword) : IRequest<Result<bool>>;
