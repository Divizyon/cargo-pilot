using System.ComponentModel.DataAnnotations.Schema;
using CargoPilot.Domain.Enums;

namespace CargoPilot.Domain.Entities;

public sealed class Vehicle : BaseEntity {
    public string VehicleName { get; private set; } = null!;
    public VehicleType VehicleType { get; private set; }
    public string PlateNumber { get; private set; } = null!;
    public decimal InternalWidth { get; private set; }
    public decimal InternalHeight { get; private set; }
    public decimal InternalLength { get; private set; }
    public decimal MaxWeightCapacity { get; private set; }
    public int LayerCount { get; private set; }
    public LoadingType LoadingType { get; private set; }
    public Guid? CompanyId { get; private set; }
#pragma warning disable S1144
    public Company? Company { get; private set; }
#pragma warning restore S1144

    // Computed from millimeter dimensions as m^3.
    [DatabaseGenerated(DatabaseGeneratedOption.Computed)]
    public decimal Volume { get; private set; }

    private Vehicle() { }

    public Vehicle(
        Guid id,
        string vehicleName,
        VehicleType vehicleType,
        string plateNumber,
        decimal internalWidth,
        decimal internalHeight,
        decimal internalLength,
        decimal maxWeightCapacity,
        int layerCount,
        LoadingType loadingType,
        Guid? companyId) : base(id) {
        VehicleName = vehicleName;
        VehicleType = vehicleType;
        PlateNumber = plateNumber;
        InternalWidth = internalWidth;
        InternalHeight = internalHeight;
        InternalLength = internalLength;
        MaxWeightCapacity = maxWeightCapacity;
        LayerCount = layerCount;
        LoadingType = loadingType;
        CompanyId = companyId;
    }
}
