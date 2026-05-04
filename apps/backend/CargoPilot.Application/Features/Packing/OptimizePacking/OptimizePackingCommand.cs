using CargoPilot.Application.Common.Models;
using CargoPilot.Application.Features.Packing.DTOs;
using MediatR;

namespace CargoPilot.Application.Features.Packing.OptimizePacking;

public sealed record OptimizePackingCommand(
    ContainerSpecDto Container,
    IReadOnlyList<ItemSpecDto> Items,
    PackingParametersDto Parameters
) : IRequest<Result<PackingResultDto>>;
