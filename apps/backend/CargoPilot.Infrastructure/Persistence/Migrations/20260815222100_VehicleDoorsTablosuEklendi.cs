using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace CargoPilot.Infrastructure.Persistence.Migrations
{
    /// <summary>
    /// Kapilar tekil <c>LoadingType</c> enum'undan liste modeline tasinir
    /// (docs/COORDINATE_STANDARD.md §4). Bir aracta ayni anda small door ve big
    /// door bulunabiliyor; tekil enum bunu ifade edemiyor ve SideBoth degeri
    /// esleme sirasinda tek tarafa dusup bilgi kaybediyordu.
    ///
    /// Bu adim toplayicidir: <c>LoadingType</c> kolonu yerinde kaliyor ve API
    /// hala onu okuyor. Gecis tamamlanana kadar iki model yan yana durur.
    ///
    /// Eski <c>SideBoth</c> (deger 3) kaldirildi: iki uzun yuzde birden big door
    /// serbest kose birakmaz ve arac tanimlanirken secilemez. Kalan satir varsa
    /// tek yana indirilir.
    ///
    /// Backfill sadik cevirir, kapi uydurmaz. Eski enum "hangi kapidan yukleniyor"
    /// sorusunu yanitliyordu, "aracta hangi kapilar var" sorusunu degil; SideRight
    /// kayitlarina bir de small door eklemek olmayan bir kapiyi varsaymak olurdu.
    /// Bu ayni zamanda davranisi birebir korur: bolge mantigi bugun yalnizca
    /// Rear'da calisiyor ve cevrimden sonra da yalnizca small door'u olan
    /// araclarda calisacak.
    /// </summary>
    public partial class VehicleDoorsTablosuEklendi : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "VehicleDoors",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    VehicleId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Type = table.Column<string>(type: "nvarchar(16)", maxLength: 16, nullable: false),
                    Face = table.Column<string>(type: "nvarchar(16)", maxLength: 16, nullable: false),
                    CreatedAtUtc = table.Column<DateTime>(type: "datetime2", nullable: false),
                    UpdatedAtUtc = table.Column<DateTime>(type: "datetime2", nullable: true),
                    DeletedAtUtc = table.Column<DateTime>(type: "datetime2", nullable: true),
                    IsDeleted = table.Column<bool>(type: "bit", nullable: false),
                    IsActive = table.Column<bool>(type: "bit", nullable: false),
                    CreatedBy = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    UpdatedBy = table.Column<Guid>(type: "uniqueidentifier", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_VehicleDoors", x => x.Id);
                    table.ForeignKey(
                        name: "FK_VehicleDoors_Vehicles_VehicleId",
                        column: x => x.VehicleId,
                        principalTable: "Vehicles",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_VehicleDoors_VehicleId_Type_Face",
                table: "VehicleDoors",
                columns: new[] { "VehicleId", "Type", "Face" },
                unique: true,
                filter: "[IsDeleted] = 0");

            // LoadingType -> kapi listesi. Rear=0, SideRight=1, SideLeft=2, Top=4
            // (CargoPilot.Domain/Enums/LoadingType.cs).
            //
            // Deger 3 (eski SideBoth) artik gecerli degil: iki uzun yuzde birden
            // big door serbest kose birakmaz ve arac tanimlanirken secilemez.
            // Boyle bir satir kalmissa tek yana (x = width) indirilir; iki kapi
            // uretmek secilemeyen bir durumu veriye yazmak olurdu.
            migrationBuilder.Sql(@"
                INSERT INTO [VehicleDoors]
                    ([Id], [VehicleId], [Type], [Face],
                     [CreatedAtUtc], [IsDeleted], [IsActive])
                SELECT NEWID(), v.[Id], d.[Type], d.[Face],
                       SYSUTCDATETIME(), 0, 1
                FROM [Vehicles] v
                CROSS APPLY (
                    SELECT 'Small' AS [Type], 'LengthZ' AS [Face] WHERE v.[LoadingType] = 0
                    UNION ALL
                    SELECT 'Big',  'WidthX' WHERE v.[LoadingType] IN (1, 3)
                    UNION ALL
                    SELECT 'Big',  'ZeroX'  WHERE v.[LoadingType] = 2
                    UNION ALL
                    SELECT 'Top',  'HeightY' WHERE v.[LoadingType] = 4
                ) d;");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            ArgumentNullException.ThrowIfNull(migrationBuilder);

            // Kapi listesi tekil LoadingType'a indirgenmez: kolon zaten dolu ve
            // Vehicle.SyncLoadingTypeFromDoors her kayitta guncelliyor, yani
            // bilgi kaybi yok. Kayip olan yalnizca tekil alanin ifade edemedigi
            // ikinci kapidir — geri alma bunu kurtaramaz (denetim S-49).
            migrationBuilder.DropTable(
                name: "VehicleDoors");
        }
    }
}
