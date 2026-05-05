using System.ComponentModel.DataAnnotations.Schema;
using CargoPilot.Domain.Enums;

namespace CargoPilot.Domain.Entities;

public sealed class Vehicle : BaseEntity {
    public string VehicleName { get; private set; } = null!;
    public string? Description { get; private set; }
    public VehicleType VehicleType { get; private set; }
    public string PlateNumber { get; private set; } = null!;
    public decimal InternalWidth { get; private set; }
    public decimal InternalHeight { get; private set; }
    public decimal InternalLength { get; private set; }
    public decimal MaxWeightCapacity { get; private set; }
    public decimal? KingPinDistanceMm { get; private set; }
    public decimal? KingPinTareWeightKg { get; private set; }
    public decimal? KingPinMaxLoadKg { get; private set; }
    public decimal? MainAxleDistanceMm { get; private set; }
    public decimal? MainAxleTareWeightKg { get; private set; }
    public decimal? MainAxleMaxLoadKg { get; private set; }
    public decimal? AdditionalAxleDistanceMm { get; private set; }
    public decimal? AdditionalAxleTareWeightKg { get; private set; }
    public decimal? AdditionalAxleMaxLoadKg { get; private set; }
#pragma warning disable S1144
    public string? Description { get; private set; }
#pragma warning restore S1144
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

    public void Update(
        string vehicleName,
        string? description,
        VehicleType vehicleType,
        string plateNumber,
        decimal internalWidth,
        decimal internalHeight,
        decimal internalLength,
        decimal maxWeightCapacity,
        decimal? kingPinDistanceMm,
        decimal? kingPinTareWeightKg,
        decimal? kingPinMaxLoadKg,
        decimal? mainAxleDistanceMm,
        decimal? mainAxleTareWeightKg,
        decimal? mainAxleMaxLoadKg,
        decimal? additionalAxleDistanceMm,
        decimal? additionalAxleTareWeightKg,
        decimal? additionalAxleMaxLoadKg,
        int layerCount,
        LoadingType loadingType,
        bool isActive) {
        VehicleName = vehicleName;
        Description = description;
        VehicleType = vehicleType;
        PlateNumber = plateNumber;
        InternalWidth = internalWidth;
        InternalHeight = internalHeight;
        InternalLength = internalLength;
        MaxWeightCapacity = maxWeightCapacity;
        KingPinDistanceMm = kingPinDistanceMm;
        KingPinTareWeightKg = kingPinTareWeightKg;
        KingPinMaxLoadKg = kingPinMaxLoadKg;
        MainAxleDistanceMm = mainAxleDistanceMm;
        MainAxleTareWeightKg = mainAxleTareWeightKg;
        MainAxleMaxLoadKg = mainAxleMaxLoadKg;
        AdditionalAxleDistanceMm = additionalAxleDistanceMm;
        AdditionalAxleTareWeightKg = additionalAxleTareWeightKg;
        AdditionalAxleMaxLoadKg = additionalAxleMaxLoadKg;
        LayerCount = layerCount;
        LoadingType = loadingType;
        SetIsActive(isActive);
    }

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
        Guid? companyId) : this(
        id,
        vehicleName,
        vehicleType,
        plateNumber,
        internalWidth,
        internalHeight,
        internalLength,
        maxWeightCapacity,
        null,
        null,
        null,
        null,
        null,
        null,
        null,
        null,
        null,
        layerCount,
        loadingType,
        companyId) { }

    public Vehicle(
        Guid id,
        string vehicleName,
        VehicleType vehicleType,
        string plateNumber,
        decimal internalWidth,
        decimal internalHeight,
        decimal internalLength,
        decimal maxWeightCapacity,
        decimal? kingPinDistanceMm,
        decimal? kingPinTareWeightKg,
        decimal? kingPinMaxLoadKg,
        decimal? mainAxleDistanceMm,
        decimal? mainAxleTareWeightKg,
        decimal? mainAxleMaxLoadKg,
        decimal? additionalAxleDistanceMm,
        decimal? additionalAxleTareWeightKg,
        decimal? additionalAxleMaxLoadKg,
        int layerCount,
        LoadingType loadingType,
        Guid? companyId,
        string? description = null) : base(id) {
        VehicleName = vehicleName;
        Description = description;
        VehicleType = vehicleType;
        PlateNumber = plateNumber;
        InternalWidth = internalWidth;
        InternalHeight = internalHeight;
        InternalLength = internalLength;
        MaxWeightCapacity = maxWeightCapacity;
        KingPinDistanceMm = kingPinDistanceMm;
        KingPinTareWeightKg = kingPinTareWeightKg;
        KingPinMaxLoadKg = kingPinMaxLoadKg;
        MainAxleDistanceMm = mainAxleDistanceMm;
        MainAxleTareWeightKg = mainAxleTareWeightKg;
        MainAxleMaxLoadKg = mainAxleMaxLoadKg;
        AdditionalAxleDistanceMm = additionalAxleDistanceMm;
        AdditionalAxleTareWeightKg = additionalAxleTareWeightKg;
        AdditionalAxleMaxLoadKg = additionalAxleMaxLoadKg;
        LayerCount = layerCount;
        LoadingType = loadingType;
        CompanyId = companyId;
    }
}
