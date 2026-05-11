using CargoPilot.Domain.Enums;

namespace CargoPilot.Domain.Entities;

public sealed class PendingVehicleMapping : BaseEntity
{
    public Guid IntegrationId { get; private set; }
    public string ErpId { get; private set; } = null!;
    public string VehicleName { get; private set; } = null!;
    public string PlateNumber { get; private set; } = null!;
    public string? RawPayload { get; private set; }
    public Guid? CompanyId { get; private set; }
    public decimal InternalWidth { get; private set; }
    public decimal InternalHeight { get; private set; }
    public decimal InternalLength { get; private set; }
    public decimal MaxWeightCapacity { get; private set; }
    public int LayerCount { get; private set; }
    public VehicleType VehicleType { get; private set; }
    public LoadingType LoadingType { get; private set; }

#pragma warning disable S1144
    public Integration? Integration { get; private set; }
#pragma warning restore S1144

    private PendingVehicleMapping() { }

    public PendingVehicleMapping(
        Guid id,
        Guid integrationId,
        string erpId,
        string vehicleName,
        string plateNumber,
        decimal internalWidth,
        decimal internalHeight,
        decimal internalLength,
        decimal maxWeightCapacity,
        int layerCount,
        VehicleType vehicleType,
        LoadingType loadingType,
        string? rawPayload,
        Guid? companyId) : base(id)
    {
        IntegrationId = integrationId;
        ErpId = erpId;
        VehicleName = vehicleName;
        PlateNumber = plateNumber;
        InternalWidth = internalWidth;
        InternalHeight = internalHeight;
        InternalLength = internalLength;
        MaxWeightCapacity = maxWeightCapacity;
        LayerCount = layerCount;
        VehicleType = vehicleType;
        LoadingType = loadingType;
        RawPayload = rawPayload;
        CompanyId = companyId;
    }
}