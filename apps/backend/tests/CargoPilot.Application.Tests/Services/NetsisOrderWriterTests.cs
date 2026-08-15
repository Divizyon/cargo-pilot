using CargoPilot.Application.Common.Settings;
using CargoPilot.Domain.Enums;
using CargoPilot.Infrastructure.Services.Erp;
using FluentAssertions;
using Microsoft.Extensions.Options;

namespace CargoPilot.Application.Tests.Services;

/// <summary>
/// ERP-18: siparis yaziminin SQL kontrati Netsis standart tablolarina (TBLSIPAMAS/
/// TBLSIPATRA) sabitlenir; satirlar parametreli yazilir ve idempotency kontrolu siparis
/// numarasi uzerinden yapilir.
/// </summary>
public sealed class NetsisOrderWriterTests
{
    private static NetsisOrderWriter CreateSut() =>
        new(Options.Create(new ErpExportSettings { CustomerCode = "120-001" }));

    [Fact]
    public void ProviderType_NetsisTir()
    {
        CreateSut().ProviderType.Should().Be(ErpProviderType.Netsis);
    }

    [Fact]
    public void HeaderInsertSql_SiparisBasligiTablosunaYazar()
    {
        NetsisOrderWriter.HeaderInsertSql.Should().Contain("INSERT INTO TBLSIPAMAS");
        NetsisOrderWriter.HeaderInsertSql.Should().Contain("FATIRS_NO");
        NetsisOrderWriter.HeaderInsertSql.Should().Contain("CARI_KODU");
        NetsisOrderWriter.HeaderInsertSql.Should().Contain("@FatirsNo");
    }

    /// <remarks>Idempotency: yazimdan once ayni siparis numarasi aranir.</remarks>
    [Fact]
    public void OrderExistsSql_SiparisNumarasiUzerindenKontrolEder()
    {
        NetsisOrderWriter.OrderExistsSql.Should().Contain("FROM TBLSIPAMAS");
        NetsisOrderWriter.OrderExistsSql.Should().Contain("WHERE FATIRS_NO = @FatirsNo");
    }

    [Fact]
    public void BuildLineInsertSql_SiparisSatirlariTablosunaYazar()
    {
        var sql = NetsisOrderWriter.BuildLineInsertSql(1);

        sql.Should().Contain("INSERT INTO TBLSIPATRA");
        sql.Should().Contain("STOK_KODU");
        sql.Should().Contain("FISNO");
        sql.Should().Contain("STHAR_GCMIK");
        sql.Should().Contain("@StokKodu0");
        sql.Should().Contain("@Miktar0");
    }

    /// <remarks>Satira ozgu degerler sirali parametrelenir; deger SQL'e gomulmez.</remarks>
    [Fact]
    public void BuildLineInsertSql_HerSatirIcinAyriParametreUretir()
    {
        var sql = NetsisOrderWriter.BuildLineInsertSql(3);

        sql.Should().Contain("@StokKodu0").And.Contain("@StokKodu1").And.Contain("@StokKodu2");
        sql.Should().Contain("@Sira2");
        sql.Should().NotContain("@StokKodu3");
    }

    /// <remarks>Siparis geneli degerler tek parametreyle paylasilir (parametre limiti).</remarks>
    [Fact]
    public void BuildLineInsertSql_SiparisGeneliDegerleriTekParametredePaylasir()
    {
        var sql = NetsisOrderWriter.BuildLineInsertSql(2);

        sql.Should().NotContain("@FisNo0");
        sql.Should().NotContain("@CariKodu0");
    }

    [Fact]
    public void BuildLineInsertSql_SatirYoksa_HataVerir()
    {
        var act = () => NetsisOrderWriter.BuildLineInsertSql(0);

        act.Should().Throw<ArgumentOutOfRangeException>();
    }
}
