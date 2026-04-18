using CargoPilot.Domain.Enums;
using CargoPilot.Domain.ValueObjects;

namespace CargoPilot.Domain.Entities;

public class Cargo
{
    public Guid Id { get; private set; }
    public TrackingNumber TrackingNumber { get; private set; }
    public CargoStatus Status { get; private set; }

    public Cargo(Guid id, TrackingNumber trackingNumber, CargoStatus status = CargoStatus.Created)
    {
        if (id == Guid.Empty)
        {
            throw new ArgumentException("Cargo id cannot be empty.", nameof(id));
        }

        Id = id;
        TrackingNumber = trackingNumber;
        Status = status;
    }

    public void SetStatus(CargoStatus status)
    {
        Status = status;
    }

    public void Cancel()
    {
        Status = CargoStatus.Cancelled;
    }
}
