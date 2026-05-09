namespace CargoPilot.Domain.Entities;

public sealed class PendingVehicleMapping : BaseEntity
{
    public Guid IntegrationId { get; private set; }
    public string ErpId { get; private set; } = null!;
    public string VehicleName { get; private set; } = null!;
    public string PlateNumber { get; private set; } = null!;
    public string? RawPayload { get; private set; }
    public Guid? CompanyId { get; private set; }

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
        string? rawPayload,
        Guid? companyId) : base(id)
    {
        IntegrationId = integrationId;
        ErpId = erpId;
        VehicleName = vehicleName;
        PlateNumber = plateNumber;
        RawPayload = rawPayload;
        CompanyId = companyId;
    }
}