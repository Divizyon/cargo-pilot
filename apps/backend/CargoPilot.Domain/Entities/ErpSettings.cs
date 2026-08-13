using CargoPilot.Domain.Enums;
using System.Security.Cryptography;
using System.Text;

namespace CargoPilot.Domain.Entities;

public sealed class ErpSettings : BaseEntity
{
    public Guid CompanyId { get; private set; }
    public ErpProviderType ProviderType { get; private set; }
    public string CompanyCode { get; private set; } = null!;
    public string Username { get; private set; } = null!;
    public string PasswordEncrypted { get; private set; } = null!;
    public string ServerAddress { get; private set; } = null!;

    /// <summary>
    /// false ise ERP sunucusunun TLS sertifikasi dogrulanir. Varsayilan false: WAN uzerinden
    /// giden baglanti araya girme saldirisina acik kalmamali. Self-signed sertifikali
    /// sunucularda kullanici bunu bilerek acar.
    /// </summary>
    public bool TrustServerCertificate { get; private set; }

    /// <summary>
    /// ERP'deki EN/BOY/GENISLIK kolonlarinin birimi. Netsis bu bilgiyi tasimadigi icin
    /// kurulumda musteri bildirir; varsayilan santimetredir.
    /// </summary>
    public ErpDimensionUnit DimensionUnit { get; private set; }

    /// <summary>ERP'deki birim agirlik kolonunun birimi; varsayilan kilogram.</summary>
    public ErpWeightUnit WeightUnit { get; private set; }

    /// <summary>Son bağlantı testinin anı; hiç test edilmediyse null.</summary>
    public DateTime? LastTestedAtUtc { get; private set; }

    /// <summary>Son bağlantı testinin sonucu; hiç test edilmediyse null.</summary>
    public bool? LastTestSucceeded { get; private set; }

    /// <summary>
    /// Test edilen yapılandırmanın imzası. Kayıtlı ayarlar bu imzadan farklıysa son test
    /// sonucu güncel değildir ve kullanıcıya 'başarılı' olarak gösterilmez.
    /// </summary>
    public string? LastTestedConfigHash { get; private set; }

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
        string serverAddress,
        bool trustServerCertificate = true,
        ErpDimensionUnit dimensionUnit = ErpDimensionUnit.Centimeter,
        ErpWeightUnit weightUnit = ErpWeightUnit.Kilogram) : base(id)
    {
        CompanyId = companyId;
        ProviderType = providerType;
        CompanyCode = companyCode;
        Username = username;
        PasswordEncrypted = passwordEncrypted;
        ServerAddress = serverAddress;
        TrustServerCertificate = trustServerCertificate;
        DimensionUnit = dimensionUnit;
        WeightUnit = weightUnit;
    }

    public void Update(
        ErpProviderType providerType,
        string companyCode,
        string username,
        string serverAddress,
        bool trustServerCertificate,
        ErpDimensionUnit dimensionUnit,
        ErpWeightUnit weightUnit,
        string? newPasswordEncrypted = null)
    {
        ProviderType = providerType;
        CompanyCode = companyCode;
        Username = username;
        ServerAddress = serverAddress;
        TrustServerCertificate = trustServerCertificate;
        DimensionUnit = dimensionUnit;
        WeightUnit = weightUnit;
        if (newPasswordEncrypted is not null)
        {
            PasswordEncrypted = newPasswordEncrypted;
            // Sifre degistiyse eski test sonucu yeni yapilandirmayi temsil etmez.
            ClearConnectionTest();
        }
    }

    public void RecordConnectionTest(bool succeeded, DateTime testedAtUtc, string testedConfigHash)
    {
        LastTestSucceeded = succeeded;
        LastTestedAtUtc = testedAtUtc;
        LastTestedConfigHash = testedConfigHash;
    }

    public void ClearConnectionTest()
    {
        LastTestSucceeded = null;
        LastTestedAtUtc = null;
        LastTestedConfigHash = null;
    }

    /// <summary>Son test sonucu kayıtlı yapılandırmayla aynı ayarlarda mı alınmış.</summary>
    public bool HasCurrentConnectionTest() =>
        LastTestedConfigHash is not null && LastTestedConfigHash == BuildCurrentConfigHash();

    public string BuildCurrentConfigHash() =>
        BuildConfigHash(ProviderType, CompanyCode, Username, ServerAddress);

    /// <summary>
    /// Bağlantıyı belirleyen alanların imzası. Şifre dahil edilmez; şifre değişikliği
    /// <see cref="Update"/> içinde ayrıca test sonucunu temizler.
    /// </summary>
    public static string BuildConfigHash(
        ErpProviderType providerType,
        string companyCode,
        string username,
        string serverAddress)
    {
        var raw = $"{providerType}|{companyCode}|{username}|{serverAddress}";
        var hash = SHA256.HashData(Encoding.UTF8.GetBytes(raw));
        return Convert.ToHexString(hash);
    }
}
