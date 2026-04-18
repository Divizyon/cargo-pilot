using CargoPilot.Domain.Enums;

namespace CargoPilot.Application.Features.Cargos.CreateCargo;

public record CreateCargoResponse(Guid Id, string TrackingNumber, CargoStatus Status);

