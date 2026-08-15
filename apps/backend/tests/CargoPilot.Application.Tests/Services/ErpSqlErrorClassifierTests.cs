using CargoPilot.Infrastructure.Services.ErpConnectors;
using FluentAssertions;

namespace CargoPilot.Application.Tests.Services;

/// <summary>
/// ERP-36 hata siniflandirma tablosu: ham SqlException mesaji yerine kullanicinin
/// eyleme donusturebilecegi Turkce mesaj doner.
/// </summary>
public sealed class ErpSqlErrorClassifierTests
{
    private const string Database = "NETSIS2024";

    [Theory]
    [InlineData(18456)]
    [InlineData(18452)]
    [InlineData(18470)]
    public void Classify_KimlikHatalari_SifreMesajiDoner(int errorNumber)
    {
        ErpSqlErrorClassifier.Classify(errorNumber, Database)
            .Should().Be(ErpSqlErrorClassifier.AuthenticationMessage);
    }

    [Theory]
    [InlineData(4060)]
    [InlineData(4064)]
    [InlineData(911)]
    [InlineData(916)]
    public void Classify_VeritabaniHatalari_VeritabaniAdiniIsaretEder(int errorNumber)
    {
        var message = ErpSqlErrorClassifier.Classify(errorNumber, Database);

        message.Should().Contain(Database);
        message.Should().Contain("veritabanı");
    }

    /// <remarks>
    /// 0, sunucudan gelmeyen tasima katmani hatasidir (guvenlik duvari, VPN, yanlis adres).
    /// Genel mesaja dusseydi kullanici kimlik bilgilerini kontrol etmeye yonlendirilirdi.
    /// </remarks>
    [Theory]
    [InlineData(0)]
    [InlineData(-2)]
    [InlineData(53)]
    [InlineData(10060)]
    [InlineData(11001)]
    public void Classify_AgHatalari_SunucuyaUlasilamadiDoner(int errorNumber)
    {
        ErpSqlErrorClassifier.Classify(errorNumber, Database)
            .Should().Be(ErpSqlErrorClassifier.UnreachableMessage);
    }

    [Fact]
    public void Classify_SertifikaHatasi_SertifikaAyariniIsaretEder()
    {
        ErpSqlErrorClassifier.Classify(-2146893019, Database)
            .Should().Be(ErpSqlErrorClassifier.UntrustedCertificateMessage);
    }

    [Fact]
    public void Classify_BilinmeyenHata_KoduIcerenGenelMesajDoner()
    {
        var message = ErpSqlErrorClassifier.Classify(9999, Database);

        message.Should().Contain("9999");
        message.Should().NotContain("Exception");
    }

    [Fact]
    public void Classify_UcAnaSinif_BirbirindenFarkliMesajUretir()
    {
        var kimlik = ErpSqlErrorClassifier.Classify(18456, Database);
        var sunucu = ErpSqlErrorClassifier.Classify(-2, Database);
        var veritabani = ErpSqlErrorClassifier.Classify(4060, Database);

        new[] { kimlik, sunucu, veritabani }.Should().OnlyHaveUniqueItems();
    }
}
