using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace CargoPilot.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class KapiKombinasyonuKisitlandi : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_VehicleDoors_VehicleId_Type_Face",
                table: "VehicleDoors");

            migrationBuilder.CreateIndex(
                name: "IX_VehicleDoors_TekKapiTipi",
                table: "VehicleDoors",
                columns: new[] { "VehicleId", "Type" },
                unique: true,
                filter: "[IsDeleted] = 0");

            migrationBuilder.AddCheckConstraint(
                name: "CK_VehicleDoors_TipYuzEslesmesi",
                table: "VehicleDoors",
                sql: "([Type] = 'Small' AND [Face] = 'LengthZ') OR ([Type] = 'Big' AND [Face] IN ('ZeroX', 'WidthX')) OR ([Type] = 'Top' AND [Face] = 'HeightY')");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_VehicleDoors_TekKapiTipi",
                table: "VehicleDoors");

            migrationBuilder.DropCheckConstraint(
                name: "CK_VehicleDoors_TipYuzEslesmesi",
                table: "VehicleDoors");

            migrationBuilder.CreateIndex(
                name: "IX_VehicleDoors_VehicleId_Type_Face",
                table: "VehicleDoors",
                columns: new[] { "VehicleId", "Type", "Face" },
                unique: true,
                filter: "[IsDeleted] = 0");
        }
    }
}
