using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace CargoPilot.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class SilinmisAraclarinKapilariTemizlendi : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            ArgumentNullException.ThrowIfNull(migrationBuilder);

            // VehicleDoorsTablosuEklendi backfill'i WHERE IsDeleted = 0 filtresi
            // tasimiyordu, yani silinmis ve taslak araclara da kapi uretildi.
            // Kapilar soft-delete edilmediginden bu satirlar filtreli benzersiz
            // indekste (IX_VehicleDoors_TekKapiTipi) yer tutmaya devam ediyor
            // (denetim S-50).
            //
            // Gecmis migration'in Up'i degistirilmez: uygulanmis veritabanlarinda
            // tekrar kosmaz. Temizlik ayri bir adimda yapilir.
            migrationBuilder.Sql(@"
                UPDATE d
                SET d.[IsDeleted] = 1, d.[IsActive] = 0
                FROM [VehicleDoors] d
                INNER JOIN [Vehicles] v ON v.[Id] = d.[VehicleId]
                WHERE v.[IsDeleted] = 1 AND d.[IsDeleted] = 0;");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            // Geri alinmaz: hangi kapinin bu adimda soft-delete edildigini
            // ayirt edecek bilgi yok. Kayit kaybi yok, yalnizca ayrim yok.
        }
    }
}
