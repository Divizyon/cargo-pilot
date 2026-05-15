using CargoPilot.Domain.Enums;

namespace CargoPilot.Domain.Entities;

public sealed class ErpSettings : BaseEntity
{
    public Guid CompanyId { get; private set; }
    public ErpProviderType ProviderType { get; private set; }
    public string CompanyCode { get; private set; } = null!;
    public string Username { get; private set; } = null!;
    public string PasswordEncrypted { get; private set; } = null!;
    public string ServerAddress { get; private set; } = null!;

#pragma warning disable S1144
    public Company? Company { get; private set; }
#pragma warning restore S1144

    private ErpSettings() { }

    public ErpSettings(
        Guid id,
        Guid companyId,
        ErpProviderType providerType,
        string companyCode,
        string username,
        string passwordEncrypted,
        string serverAddress) : base(id)
    {
        CompanyId = companyId;
        ProviderType = providerType;
        CompanyCode = companyCode;
        Username = username;
        PasswordEncrypted = passwordEncrypted;
        ServerAddress = serverAddress;
    }

    public void Update(
        ErpProviderType providerType,
        string companyCode,
        string username,
        string serverAddress,
        string? newPasswordEncrypted = null)
    {
        ProviderType = providerType;
        CompanyCode = companyCode;
        Username = username;
        ServerAddress = serverAddress;
        if (newPasswordEncrypted is not null)
            PasswordEncrypted = newPasswordEncrypted;
    }
}
