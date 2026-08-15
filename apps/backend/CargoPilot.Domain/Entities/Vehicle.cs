using System.ComponentModel.DataAnnotations.Schema;
using CargoPilot.Domain.Enums;

namespace CargoPilot.Domain.Entities;

public sealed class Vehicle : BaseEntity {
    public string VehicleName { get; private set; } = null!;
    public string? Description { get; private set; }
    public VehicleType VehicleType { get; private set; }
    public string? PlateNumber { get; private set; }
    public decimal? InternalWidth { get; private set; }
    public decimal? InternalHeight { get; private set; }
    public decimal? InternalLength { get; private set; }
    public decimal? MaxWeightCapacity { get; private set; }
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

#pragma warning restore S1144
    public int LayerCount { get; private set; }

    /// <summary>
    /// Tekil kapi yonu. <see cref="Doors"/> listesine gecis tamamlanana kadar
    /// korunuyor; motor ve API hala bu alani okuyor.
    /// </summary>
    public LoadingType LoadingType { get; private set; }

    /// <summary>
    /// Aracin kapilari (docs/COORDINATE_STANDARD.md §4). Bir aracta ayni anda
    /// small door ve big door bulunabildigi icin kapi bilgisi listedir; tekil
    /// <see cref="LoadingType"/> "hangi kapidan yukleniyor" sorusunu yanitliyordu,
    /// "aracta hangi kapilar var" sorusunu degil. Her tipten en fazla bir kapi
    /// olabilir (VehicleDoorRules).
    /// </summary>
    public ICollection<VehicleDoor> Doors { get; } = [];
    public Guid? CompanyId { get; private set; }
    public string? ErpId { get; private set; }
    public Guid? IntegrationId { get; private set; }
#pragma warning disable S1144
    public Company? Company { get; private set; }
    public Integration? Integration { get; private set; }
#pragma warning restore S1144

    public bool IsDraft { get; private set; }

    [NotMapped]
    public string Status { get {
        if (IsDraft) return VehicleStatus.Draft;
        if (IsActive) return VehicleStatus.Active;
        return VehicleStatus.Passive;
    } }

    // Computed from millimeter dimensions as m^3.
    [DatabaseGenerated(DatabaseGeneratedOption.Computed)]
    public decimal? Volume { get; private set; }

    private Vehicle() { }

    public void SetErpSource(string erpId, Guid integrationId) {
        ErpId = erpId;
        IntegrationId = integrationId;
    }

    public void ClearErpSource() {
        ErpId = null;
        IntegrationId = null;
    }

    public void Update(
        string vehicleName,
        string? description,
        VehicleType vehicleType,
        string? plateNumber,
        decimal? internalWidth,
        decimal? internalHeight,
        decimal? internalLength,
        decimal? maxWeightCapacity,
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
        bool isActive,
        bool isDraft = false) {
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
        IsDraft = isDraft;
        SetIsActive(isActive);
    }

    public Vehicle(
        Guid id,
        string vehicleName,
        VehicleType vehicleType,
        string? plateNumber,
        decimal? internalWidth,
        decimal? internalHeight,
        decimal? internalLength,
        decimal? maxWeightCapacity,
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
        string? plateNumber,
        decimal? internalWidth,
        decimal? internalHeight,
        decimal? internalLength,
        decimal? maxWeightCapacity,
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
        string? description = null,
        bool isDraft = false) : base(id) {
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
        IsDraft = isDraft;
    }

    /// <summary>
    /// Aracin kapi listesini verilen kumeyle degistirir. Eski kapilar iliskiden
    /// dusurulur; VehicleDoor bagimsiz bir kayit degil, aracin bir parcasidir.
    /// </summary>
    public void ReplaceDoors(IEnumerable<(DoorType Type, DoorFace Face)> doors) {
        Doors.Clear();
        foreach (var (type, face) in doors)
            Doors.Add(new VehicleDoor(Guid.NewGuid(), Id, type, face));
    }
}
