namespace CargoPilot.Domain.Entities;

public sealed class UserVehicleFavorite : BaseEntity {
    public Guid UserId { get; private set; }
    public Guid VehicleId { get; private set; }

    private UserVehicleFavorite() { }

    public UserVehicleFavorite(Guid id, Guid userId, Guid vehicleId) : base(id) {
        if (userId == Guid.Empty)
            throw new ArgumentException("UserId cannot be empty.", nameof(userId));
        if (vehicleId == Guid.Empty)
            throw new ArgumentException("VehicleId cannot be empty.", nameof(vehicleId));

        UserId = userId;
        VehicleId = vehicleId;
    }
}
