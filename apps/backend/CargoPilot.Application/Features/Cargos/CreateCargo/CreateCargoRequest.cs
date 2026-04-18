using CargoPilot.Domain.Enums;

namespace CargoPilot.Application.Features.Cargos.CreateCargo;

public record CreateCargoRequest(string TrackingNumber, CargoStatus? Status);

