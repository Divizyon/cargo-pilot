using CargoPilot.Application.Common.Models;
using MediatR;

namespace CargoPilot.Application.Features.Shares.RecordShareView;

public sealed record RecordShareViewCommand(string Token) : IRequest<Result<bool>>;
