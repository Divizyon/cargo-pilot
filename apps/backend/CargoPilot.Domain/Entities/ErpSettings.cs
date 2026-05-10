using CargoPilot.Domain.Enums;

namespace CargoPilot.Domain.Entities;

public sealed class ErpSettings : BaseEntity
{
    public Guid CompanyId { get; private set; }
    public string CompanyCode { get; private set; } = null!;
    public string Username { get; private set; } = null!;
    public string ServerAddress { get; private set; } = null!;
    public string EncryptedPassword { get; private set; } = null!;
    public ErpProvider Provider { get; private set; }

#pragma warning disable S1144
    public Company? Company { get; private set; }
#pragma warning restore S1144

    private ErpSettings() { }

    public ErpSettings(
        Guid id,
        Guid companyId,
        string companyCode,
        string username,
        string serverAddress,
        string encryptedPassword,
        ErpProvider provider) : base(id)
    {
        CompanyId = companyId;
        CompanyCode = companyCode;
        Username = username;
        ServerAddress = serverAddress;
        EncryptedPassword = encryptedPassword;
        Provider = provider;
    }

    public void Update(
        string companyCode,
        string username,
        string serverAddress,
        string encryptedPassword,
        ErpProvider provider)
    {
        CompanyCode = companyCode;
        Username = username;
        ServerAddress = serverAddress;
        EncryptedPassword = encryptedPassword;
        Provider = provider;
    }
}
