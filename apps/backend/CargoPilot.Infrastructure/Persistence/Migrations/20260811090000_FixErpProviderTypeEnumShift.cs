using CargoPilot.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace CargoPilot.Infrastructure.Persistence.Migrations
{
    /// <summary>
    /// ERP-04 tek seferlik veri düzeltmesi.
    /// Frontend, ErpProviderType için {Logo:0, Netsis:1} gönderiyordu; backend ise
    /// {Logo:1, Netsis:2} bekliyor. Bu yüzden Logo seçimi hiç kaydedilemedi (0 değeri
    /// IsInEnum doğrulamasına takılıp 400 döndü), Netsis seçimi ise 1 olarak gelip
    /// "Logo" adıyla saklandı. Sonuç: veritabanındaki her "Logo" kaydı aslında Netsis
    /// niyetiyle oluşturulmuştur. Bu migration şema değil yalnızca veri düzeltir.
    /// </summary>
    [DbContext(typeof(AppDbContext))]
    [Migration("20260811090000_FixErpProviderTypeEnumShift")]
    public partial class FixErpProviderTypeEnumShift : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(@"
UPDATE i
SET    i.SystemName = N'Netsis'
FROM   Integrations i
JOIN   ErpSettings e ON e.CompanyId = i.CompanyId
WHERE  e.ProviderType = N'Logo' AND i.SystemName = N'Logo';");

            migrationBuilder.Sql(@"
UPDATE ErpSettings
SET    ProviderType = N'Netsis'
WHERE  ProviderType = N'Logo';");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            // Düzeltilen kayıtlar ile gerçek Netsis kayıtları ayırt edilemediğinden
            // geri alma bilinçli olarak boş bırakıldı.
        }
    }
}
