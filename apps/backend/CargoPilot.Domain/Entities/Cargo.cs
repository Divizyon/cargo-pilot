using CargoPilot.Domain.Enums;
using CargoPilot.Domain.ValueObjects;

namespace CargoPilot.Domain.Entities;

public class Cargo : BaseEntity {
    public TrackingNumber TrackingNumber { get; private set; }
    public CargoStatus Status { get; private set; }

    protected Cargo() : base() { TrackingNumber = null!; }

    public Cargo(Guid id, TrackingNumber trackingNumber, CargoStatus status = CargoStatus.Created)
        : base(id) {
        TrackingNumber = trackingNumber;
        Status = status;
    }

    public void SetStatus(CargoStatus status) {
        Status = status;
    }

    public void Cancel() {
        Status = CargoStatus.Cancelled;
    }
}
