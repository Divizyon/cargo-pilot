using CargoPilot.Application.Common.Models;
using MediatR;

namespace CargoPilot.Application.Features.Integrations.GetPendingVehicleMappings;

public sealed record GetPendingVehicleMappingsQuery(Guid IntegrationId)
    : IRequest<Result<IReadOnlyList<PendingVehicleMappingDto>>>;

public sealed record PendingVehicleMappingDto(
    Guid Id,
    Guid IntegrationId,
    string ErpId,
    string VehicleName,
    string PlateNumber,
    string? RawPayload,
    DateTime CreatedAtUtc);