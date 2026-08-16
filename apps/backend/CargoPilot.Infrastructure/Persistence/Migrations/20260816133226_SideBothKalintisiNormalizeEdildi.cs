using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace CargoPilot.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class SideBothKalintisiNormalizeEdildi : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            ArgumentNullException.ThrowIfNull(migrationBuilder);

            // LoadingType enum'undan SideBoth = 3 kaldirildi ama kolon int
            // oldugu icin eski satirlarda deger kalabilir. Boyle bir arac API
            // uzerinden guncellenemiyordu: IsInEnum() dogrulamasi 400 "Gecersiz
            // yukleme tipi" donuyordu.
            //
            // Hedef deger 1 (SideRight): VehicleDoorsTablosuEklendi backfill'i
            // de 3'u Big@WidthX olarak yazmisti, yani kapi tablosu zaten
            // SideRight anlamina geliyor. Baska bir degere cevirmek kapi
            // listesiyle celisirdi.
            migrationBuilder.Sql(
                "UPDATE [Vehicles] SET [LoadingType] = 1 WHERE [LoadingType] = 3;");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            // Geri alinamaz: hangi SideRight kaydinin eskiden SideBoth oldugunu
            // ayirt edecek bilgi kalmadi. Kayit kaybi yok, yalnizca ayrim yok.
        }
    }
}
