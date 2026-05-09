using CargoPilot.Application.Common.Models;
using MediatR;

namespace CargoPilot.Application.Features.Me.UpdateTourCompleted;

public sealed record UpdateTourCompletedCommand(bool TourCompleted) : IRequest<Result<bool>>;
